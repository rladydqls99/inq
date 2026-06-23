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
  cardId: string;
  stage: number;
  dueAt: Date | null;
  completedAt: Date | null;
};

export type ChallengeRunQueueCard = {
  sessionCardId: string;
  stateId: string;
  cardId: string;
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
      cardId: state.cardId,
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
      challengeId,
      completedAt: null,
      OR: [{ dueAt: null }, { dueAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
  });
  const queue = buildChallengeRunQueue(
    states.map((state) => ({
      stateId: state.id,
      cardId: state.cardId,
      stage: state.stage,
      dueAt: state.dueAt,
      completedAt: state.completedAt,
    })),
  );
  const session = await prisma.challengeRunSession.create({
    data: {
      challengeId,
      queue: queue as unknown as Prisma.InputJsonValue,
    },
  });

  return toChallengeRunState(prisma, session);
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

  await prisma.$transaction([
    prisma.challengeRunSession.update({
      where: { id: session.id },
      data: {
        queue: applied.queue as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.challengeCardState.update({
      where: { id: updatedCard.stateId },
      data: {
        stage: applied.transition.stage,
        dueAt: applied.transition.dueAt,
        completedAt: applied.transition.completedAt,
        result: input.finalResult,
        lastChallengedAt: now,
        challengeViewCount: { increment: 1 },
      },
    }),
    prisma.challengeAnswerEvent.create({
      data: {
        challengeId: input.challengeId,
        stateId: updatedCard.stateId,
        cardId: updatedCard.cardId,
        sessionCardId: updatedCard.sessionCardId,
        finalResult: input.finalResult,
        previousStage: applied.transition.event.previousStage,
        nextStage: applied.transition.event.nextStage,
        answeredAt: now,
      },
    }),
  ]);

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
  const queue = parseQueue(session.queue);
  const cards = await prisma.card.findMany({
    where: {
      id: { in: queue.map((card) => card.cardId) },
    },
  });
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  return {
    sessionId: session.id,
    challengeId: session.challengeId,
    status: session.status as ChallengeRunState["status"],
    cursor: session.cursor,
    cards: queue.map((queueCard): ChallengeRunCard => {
      const card = cardsById.get(queueCard.cardId);

      if (!card) {
        throw new Error(`Card not found: ${queueCard.cardId}`);
      }

      return {
        sessionCardId: queueCard.sessionCardId,
        stateId: queueCard.stateId,
        cardId: queueCard.cardId,
        segments: card.segments as QuizSegment[],
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
