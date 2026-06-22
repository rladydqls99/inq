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
