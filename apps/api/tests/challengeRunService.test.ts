import { describe, expect, it, vi } from "vitest";

import {
  applySessionCardResult,
  buildChallengeRunQueue,
  calculateStageTransition,
} from "../src/services/challengeRunService";

const now = new Date("2026-06-22T00:00:00.000+09:00");
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
      dueAt: new Date("2026-06-25T00:00:00.000+09:00"),
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
      dueAt: new Date("2026-06-27T00:00:00.000+09:00"),
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
      dueAt: new Date("2026-07-02T00:00:00.000+09:00"),
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

  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [3, 2],
  ])(
    "moves wrong answers from stage %s to %s until the next Seoul day",
    (stage, nextStage) => {
      expect(
        calculateStageTransition({
          stage,
          result: "wrong",
          intervalsDays,
          now,
        }),
      ).toMatchObject({
        stage: nextStage,
        dueAt: new Date("2026-06-23T00:00:00.000+09:00"),
        completedAt: null,
        event: { previousStage: stage, nextStage },
      });
    },
  );

  it("schedules a correct answer at midnight of the target date in Seoul", () => {
    expect(
      calculateStageTransition({
        stage: 0,
        result: "correct",
        intervalsDays: [1, 3, 10],
        now: new Date("2026-08-26T23:00:00.000+09:00"),
      }),
    ).toMatchObject({
      stage: 1,
      dueAt: new Date("2026-08-27T00:00:00.000+09:00"),
      completedAt: null,
    });
  });
});

describe("buildChallengeRunQueue", () => {
  it("includes incomplete cards even when dueAt is in the future", () => {
    const queue = buildChallengeRunQueue([
      {
        stateId: "state-1",
        challengeCardId: "challenge-card-1",
        stage: 0,
        dueAt: new Date("2026-12-31T00:00:00.000Z"),
        completedAt: null,
      },
    ]);

    expect(queue).toEqual([
      {
        sessionCardId: "state-1",
        stateId: "state-1",
        challengeCardId: "challenge-card-1",
        queueIndex: 0,
        startingStage: 0,
        selectedResult: null,
      },
    ]);
  });

  it("randomizes a new run queue and reindexes the shuffled cards", () => {
    const random = vi.fn().mockReturnValue(0);
    const queue = buildChallengeRunQueue(
      [
        {
          stateId: "state-1",
          challengeCardId: "challenge-card-1",
          stage: 0,
          dueAt: null,
          completedAt: null,
        },
        {
          stateId: "state-2",
          challengeCardId: "challenge-card-2",
          stage: 0,
          dueAt: null,
          completedAt: null,
        },
        {
          stateId: "state-3",
          challengeCardId: "challenge-card-3",
          stage: 0,
          dueAt: null,
          completedAt: null,
        },
      ],
      random,
    );

    expect(queue.map((card) => card.sessionCardId)).toEqual([
      "state-2",
      "state-3",
      "state-1",
    ]);
    expect(queue.map((card) => card.queueIndex)).toEqual([0, 1, 2]);
    expect(random).toHaveBeenCalledTimes(2);
  });
});

describe("applySessionCardResult", () => {
  it("uses the starting stage when changing or resubmitting a result", () => {
    let queue = buildChallengeRunQueue([
      {
        stateId: "state-1",
        challengeCardId: "challenge-card-1",
        stage: 2,
        dueAt: null,
        completedAt: null,
      },
    ]);

    for (const [result, expectedStage, isCorrection] of [
      ["correct", 3, false],
      ["wrong", 1, true],
      ["wrong", 1, true],
      ["correct", 3, true],
    ] as const) {
      const applied = applySessionCardResult({
        queue,
        sessionCardId: "state-1",
        result,
        intervalsDays,
        now,
      });

      expect(applied.transition).toMatchObject({
        stage: expectedStage,
        event: { previousStage: 2, nextStage: expectedStage, isCorrection },
      });
      queue = applied.queue;
    }
  });

  it("keeps a wrong card in place so each card is attempted once per run", () => {
    const queue = buildChallengeRunQueue(
      [
        {
          stateId: "state-1",
          challengeCardId: "challenge-card-1",
          stage: 0,
          dueAt: null,
          completedAt: null,
        },
        {
          stateId: "state-2",
          challengeCardId: "challenge-card-2",
          stage: 0,
          dueAt: null,
          completedAt: null,
        },
      ],
      () => 0.999,
    );

    const result = applySessionCardResult({
      queue,
      sessionCardId: "state-1",
      result: "wrong",
      intervalsDays,
      now,
    });

    expect(result.queue.map((card) => card.sessionCardId)).toEqual([
      "state-1",
      "state-2",
    ]);
    expect(result.queue[0]?.selectedResult).toBe("wrong");
  });

  it("recalculates a corrected result from starting stage and keeps queue order stable", () => {
    const queue = [
      {
        sessionCardId: "state-2",
        stateId: "state-2",
        challengeCardId: "challenge-card-2",
        queueIndex: 0,
        startingStage: 0,
        selectedResult: null,
      },
      {
        sessionCardId: "state-1",
        stateId: "state-1",
        challengeCardId: "challenge-card-1",
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
      dueAt: new Date("2026-06-25T00:00:00.000+09:00"),
      completedAt: null,
      event: {
        previousStage: 0,
        nextStage: 1,
        isCorrection: true,
      },
    });
  });
});
