import { describe, expect, it } from "vitest";

import {
  applySessionCardResult,
  buildChallengeRunQueue,
  calculateStageTransition,
} from "../src/services/challengeRunService";

const now = new Date("2026-06-22T00:00:00.000Z");
const intervalsDays = [3, 5, 10];

describe("calculateStageTransition", () => {
  it("advances correct answers through stages and then completes", () => {
    expect(
      calculateStageTransition({
        stage: 0,
        result: "correct",
        intervalsDays,
        now,
      }),
    ).toMatchObject({
      stage: 1,
      dueAt: new Date("2026-06-25T00:00:00.000Z"),
      completedAt: null,
      event: { previousStage: 0, nextStage: 1 },
    });

    expect(
      calculateStageTransition({
        stage: 1,
        result: "correct",
        intervalsDays,
        now,
      }),
    ).toMatchObject({
      stage: 2,
      dueAt: new Date("2026-06-27T00:00:00.000Z"),
      completedAt: null,
      event: { previousStage: 1, nextStage: 2 },
    });

    expect(
      calculateStageTransition({
        stage: 2,
        result: "correct",
        intervalsDays,
        now,
      }),
    ).toMatchObject({
      stage: 3,
      dueAt: new Date("2026-07-02T00:00:00.000Z"),
      completedAt: null,
      event: { previousStage: 2, nextStage: 3 },
    });

    expect(
      calculateStageTransition({
        stage: 3,
        result: "correct",
        intervalsDays,
        now,
      }),
    ).toMatchObject({
      stage: 3,
      dueAt: null,
      completedAt: now,
      event: { previousStage: 3, nextStage: null },
    });
  });

  it("resets wrong answers to stage 0 and schedules the first interval", () => {
    expect(
      calculateStageTransition({
        stage: 2,
        result: "wrong",
        intervalsDays,
        now,
      }),
    ).toMatchObject({
      stage: 0,
      dueAt: new Date("2026-06-25T00:00:00.000Z"),
      completedAt: null,
      event: { previousStage: 2, nextStage: 0 },
    });
  });
});

describe("buildChallengeRunQueue", () => {
  it("includes incomplete cards even when dueAt is in the future", () => {
    const queue = buildChallengeRunQueue([
      {
        stateId: "state-1",
        cardId: "card-1",
        stage: 0,
        dueAt: new Date("2026-12-31T00:00:00.000Z"),
        completedAt: null,
      },
    ]);

    expect(queue).toEqual([
      {
        sessionCardId: "state-1",
        stateId: "state-1",
        cardId: "card-1",
        queueIndex: 0,
        startingStage: 0,
        selectedResult: null,
      },
    ]);
  });
});

describe("applySessionCardResult", () => {
  it("moves a first-time wrong card to the back of the current queue", () => {
    const queue = buildChallengeRunQueue([
      {
        stateId: "state-1",
        cardId: "card-1",
        stage: 0,
        dueAt: null,
        completedAt: null,
      },
      {
        stateId: "state-2",
        cardId: "card-2",
        stage: 0,
        dueAt: null,
        completedAt: null,
      },
    ]);

    const result = applySessionCardResult({
      queue,
      sessionCardId: "state-1",
      result: "wrong",
      intervalsDays,
      now,
    });

    expect(result.queue.map((card) => card.sessionCardId)).toEqual([
      "state-2",
      "state-1",
    ]);
    expect(result.queue[1]?.selectedResult).toBe("wrong");
  });

  it("recalculates a corrected result from starting stage and keeps queue order stable", () => {
    const queue = [
      {
        sessionCardId: "state-2",
        stateId: "state-2",
        cardId: "card-2",
        queueIndex: 0,
        startingStage: 0,
        selectedResult: null,
      },
      {
        sessionCardId: "state-1",
        stateId: "state-1",
        cardId: "card-1",
        queueIndex: 1,
        startingStage: 0,
        selectedResult: "wrong" as const,
      },
    ];

    const result = applySessionCardResult({
      queue,
      sessionCardId: "state-1",
      result: "correct",
      intervalsDays,
      now,
    });

    expect(result.queue.map((card) => card.sessionCardId)).toEqual([
      "state-2",
      "state-1",
    ]);
    expect(result.queue[1]?.selectedResult).toBe("correct");
    expect(result.transition).toMatchObject({
      stage: 1,
      dueAt: new Date("2026-06-25T00:00:00.000Z"),
      completedAt: null,
      event: {
        previousStage: 0,
        nextStage: 1,
        isCorrection: true,
      },
    });
  });
});
