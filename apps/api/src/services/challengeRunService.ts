import type { Prisma, PrismaClient } from "@inq/db";
import type {
  ChallengeProgress,
  ChallengeRunCard,
  ChallengeRunState,
  QuizSegment,
  SubmitChallengeCardResultResponse,
} from "@inq/shared";
import { findChallenge, toChallengeResponse } from "./challengeService";

export type ChallengeAnswerResult = "correct" | "wrong";

export type ChallengeCardStateSnapshot = {
  stateId: string;
  challengeCardId: string;
  stage: number;
  dueAt: Date | null;
  completedAt: Date | null;
};

export type ChallengeRunQueueCard = {
  sessionCardId: string;
  stateId: string;
  challengeCardId: string;
  queueIndex: number;
  startingStage: number;
  selectedResult: ChallengeAnswerResult | null;
};

export type ChallengeStageTransition = {
  stage: number;
  dueAt: Date | null;
  completedAt: Date | null;
  result: ChallengeAnswerResult | "completed";
  event: {
    previousStage: number;
    nextStage: number | null;
    isCorrection: boolean;
  };
};

export function calculateStageTransition(input: {
  stage: number;
  result: ChallengeAnswerResult;
  intervalsDays: number[];
  now: Date;
  isCorrection?: boolean;
}): ChallengeStageTransition {
  if (input.result === "wrong") {
    return {
      stage: 0,
      dueAt: addDays(input.now, firstInterval(input.intervalsDays)),
      completedAt: null,
      result: "wrong",
      event: {
        previousStage: input.stage,
        nextStage: 0,
        isCorrection: input.isCorrection ?? false,
      },
    };
  }

  if (input.stage >= input.intervalsDays.length) {
    return {
      stage: input.stage,
      dueAt: null,
      completedAt: input.now,
      result: "completed",
      event: {
        previousStage: input.stage,
        nextStage: null,
        isCorrection: input.isCorrection ?? false,
      },
    };
  }

  const nextStage = input.stage + 1;

  return {
    stage: nextStage,
    dueAt: addDays(input.now, input.intervalsDays[input.stage] ?? 0),
    completedAt: null,
    result: "correct",
    event: {
      previousStage: input.stage,
      nextStage,
      isCorrection: input.isCorrection ?? false,
    },
  };
}

export function buildChallengeRunQueue(
  states: ChallengeCardStateSnapshot[],
): ChallengeRunQueueCard[] {
  return states
    .filter((state) => state.completedAt === null)
    .map((state, index) => ({
      sessionCardId: state.stateId,
      stateId: state.stateId,
      challengeCardId: state.challengeCardId,
      queueIndex: index,
      startingStage: state.stage,
      selectedResult: null,
    }));
}

export function applySessionCardResult(input: {
  queue: ChallengeRunQueueCard[];
  sessionCardId: string;
  result: ChallengeAnswerResult;
  intervalsDays: number[];
  now: Date;
}): { queue: ChallengeRunQueueCard[]; transition: ChallengeStageTransition } {
  const targetIndex = input.queue.findIndex(
    (card) => card.sessionCardId === input.sessionCardId,
  );

  if (targetIndex === -1) {
    throw new Error(`Session card not found: ${input.sessionCardId}`);
  }

  const targetCard = input.queue[targetIndex];

  if (!targetCard) {
    throw new Error(`Session card not found: ${input.sessionCardId}`);
  }

  const isFirstSelection = targetCard.selectedResult === null;
  const updatedTarget: ChallengeRunQueueCard = {
    ...targetCard,
    selectedResult: input.result,
  };
  const queue = input.queue.map((card, index) =>
    index === targetIndex ? updatedTarget : card,
  );
  const shouldMoveToBack = isFirstSelection && input.result === "wrong";
  const nextQueue = shouldMoveToBack ? moveCardToBack(queue, targetIndex) : queue;

  return {
    queue: reindexQueue(nextQueue),
    transition: calculateStageTransition({
      stage: targetCard.startingStage,
      result: input.result,
      intervalsDays: input.intervalsDays,
      now: input.now,
      isCorrection: !isFirstSelection,
    }),
  };
}

export async function getOrCreateChallengeRunState(
  prisma: PrismaClient,
  challengeId: string,
  now = new Date(),
): Promise<ChallengeRunState> {
  const existing = await prisma.challengeRunSession.findFirst({
    where: {
      challengeId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return toChallengeRunState(prisma, existing);
  }

  const states = await prisma.challengeCardState.findMany({
    where: {
      challengeCard: { challengeId },
      completedAt: null,
      OR: [{ dueAt: null }, { dueAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
  });
  const queue = buildChallengeRunQueue(
    states.map((state) => ({
      stateId: state.id,
      challengeCardId: state.challengeCardId,
      stage: state.stage,
      dueAt: state.dueAt,
      completedAt: state.completedAt,
    })),
  );
  const incompleteStateCount =
    queue.length === 0
      ? await prisma.challengeCardState.count({
          where: {
            challengeCard: { challengeId },
            completedAt: null,
          },
        })
      : queue.length;

  if (queue.length === 0) {
    const completedSession = await prisma.challengeRunSession.findFirst({
      where: {
        challengeId,
        status: "completed",
      },
      orderBy: { createdAt: "desc" },
    });

    if (completedSession) {
      return toChallengeRunState(prisma, completedSession);
    }
  }

  const session = await prisma.$transaction(async (transaction) => {
    const runSession = await transaction.challengeRunSession.create({
      data: {
        challengeId,
        queue: queue as unknown as Prisma.InputJsonValue,
        status: queue.length === 0 ? "completed" : "active",
        completedAt: queue.length === 0 ? now : null,
      },
    });

    if (incompleteStateCount === 0) {
      await transaction.challenge.update({
        where: { id: challengeId },
        data: {
          status: "completed",
          completedAt: now,
        },
      });
    }

    return runSession;
  });

  return toChallengeRunState(prisma, session);
}

export async function updateChallengeRunCursor(
  prisma: PrismaClient,
  input: { challengeId: string; cursor: number },
): Promise<ChallengeRunState> {
  const session = await prisma.challengeRunSession.findFirstOrThrow({
    where: {
      challengeId: input.challengeId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });
  const queue = parseQueue(session.queue);
  const boundedCursor = Math.min(Math.max(input.cursor, 0), queue.length);
  const completed = boundedCursor >= queue.length;
  const updatedSession = await prisma.challengeRunSession.update({
    where: { id: session.id },
    data: {
      cursor: boundedCursor,
      status: completed ? "completed" : "active",
      completedAt: completed ? new Date() : null,
    },
  });

  return toChallengeRunState(prisma, updatedSession);
}

export async function submitChallengeRunResult(
  prisma: PrismaClient,
  input: {
    challengeId: string;
    sessionCardId: string;
    finalResult: ChallengeAnswerResult;
    now?: Date;
  },
): Promise<SubmitChallengeCardResultResponse> {
  const now = input.now ?? new Date();
  const challenge = await prisma.challenge.findUniqueOrThrow({
    where: { id: input.challengeId },
    select: { reviewIntervalsDays: true },
  });
  const session = await prisma.challengeRunSession.findFirstOrThrow({
    where: {
      challengeId: input.challengeId,
      status: "active",
    },
  });
  const queue = parseQueue(session.queue);
  const applied = applySessionCardResult({
    queue,
    sessionCardId: input.sessionCardId,
    result: input.finalResult,
    intervalsDays: challenge.reviewIntervalsDays as number[],
    now,
  });
  const updatedCard = applied.queue.find(
    (card) => card.sessionCardId === input.sessionCardId,
  );

  if (!updatedCard) {
    throw new Error(`Session card not found: ${input.sessionCardId}`);
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.challengeRunSession.update({
      where: { id: session.id },
      data: {
        queue: applied.queue as unknown as Prisma.InputJsonValue,
      },
    });
    await transaction.challengeCardState.update({
      where: { id: updatedCard.stateId },
      data: {
        stage: applied.transition.stage,
        dueAt: applied.transition.dueAt,
        completedAt: applied.transition.completedAt,
        result: input.finalResult,
        lastChallengedAt: now,
        challengeViewCount: { increment: 1 },
      },
    });
    await transaction.challengeAnswerEvent.create({
      data: {
        challengeId: input.challengeId,
        stateId: updatedCard.stateId,
        challengeCardId: updatedCard.challengeCardId,
        sessionCardId: updatedCard.sessionCardId,
        finalResult: input.finalResult,
        previousStage: applied.transition.event.previousStage,
        nextStage: applied.transition.event.nextStage,
        answeredAt: now,
      },
    });

    const remainingCards = await transaction.challengeCardState.count({
      where: {
        challengeCard: { challengeId: input.challengeId },
        completedAt: null,
      },
    });

    await transaction.challenge.update({
      where: { id: input.challengeId },
      data:
        remainingCards === 0
          ? { status: "completed", completedAt: now }
          : { status: "active", completedAt: null },
    });
  });

  return {
    runState: await toChallengeRunState(
      prisma,
      await prisma.challengeRunSession.findUniqueOrThrow({
        where: { id: session.id },
      }),
    ),
    progress: toChallengeResponse(
      await findChallenge(prisma, input.challengeId),
      now,
    ).progress as ChallengeProgress,
  };
}

async function toChallengeRunState(
  prisma: PrismaClient,
  session: {
    id: string;
    challengeId: string;
    status: string;
    cursor: number;
    queue: unknown;
  },
): Promise<ChallengeRunState> {
  let queue = parseQueue(session.queue);
  const challengeCards = await prisma.challengeCard.findMany({
    where: {
      id: { in: queue.map((card) => card.challengeCardId) },
    },
  });
  const challengeCardsById = new Map(
    challengeCards.map((card) => [card.id, card]),
  );
  const validQueue = reindexQueue(
    queue.filter((queueCard) =>
      challengeCardsById.has(queueCard.challengeCardId),
    ),
  );

  if (validQueue.length !== queue.length) {
    const cursor = Math.min(session.cursor, validQueue.length);
    const completed = cursor >= validQueue.length;
    await prisma.challengeRunSession.update({
      where: { id: session.id },
      data: {
        queue: validQueue as unknown as Prisma.InputJsonValue,
        cursor,
        status: completed ? "completed" : session.status,
        completedAt: completed ? new Date() : null,
      },
    });
    queue = validQueue;
    session.cursor = cursor;
    session.status = completed ? "completed" : session.status;
  }

  return {
    sessionId: session.id,
    challengeId: session.challengeId,
    status: session.status as ChallengeRunState["status"],
    cursor: session.cursor,
    cards: queue.map((queueCard): ChallengeRunCard => {
      const challengeCard = challengeCardsById.get(
        queueCard.challengeCardId,
      );

      if (!challengeCard) {
        throw new Error(
          `Challenge card not found after queue cleanup: ${queueCard.challengeCardId}`,
        );
      }

      return {
        sessionCardId: queueCard.sessionCardId,
        stateId: queueCard.stateId,
        challengeCardId: queueCard.challengeCardId,
        segments: challengeCard.segments as QuizSegment[],
        queueIndex: queueCard.queueIndex,
        selectedResult: queueCard.selectedResult,
      };
    }),
  };
}

function parseQueue(queue: unknown): ChallengeRunQueueCard[] {
  return queue as ChallengeRunQueueCard[];
}

function moveCardToBack(
  queue: ChallengeRunQueueCard[],
  targetIndex: number,
): ChallengeRunQueueCard[] {
  const nextQueue = [...queue];
  const [targetCard] = nextQueue.splice(targetIndex, 1);

  if (!targetCard) {
    return queue;
  }

  return [...nextQueue, targetCard];
}

function reindexQueue(queue: ChallengeRunQueueCard[]): ChallengeRunQueueCard[] {
  return queue.map((card, index) => ({
    ...card,
    queueIndex: index,
  }));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function firstInterval(intervalsDays: number[]): number {
  return intervalsDays[0] ?? 0;
}
