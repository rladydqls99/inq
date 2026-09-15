import { describe, expect, it } from "vitest";

import { createCard } from "@inq/db/repositories/cards";
import { createChallenge } from "@inq/db/repositories/challenges";
import type { ChallengeRunState, QuizSegment } from "@inq/shared";
import { createApp } from "../src/app";
import {
  getOrCreateChallengeRunState,
  submitChallengeRunResult,
  updateChallengeRunCursor,
} from "../src/services/challengeRunService";
import { listChallengeResponses } from "../src/services/challengeService";
import { createTestPrisma, testEnv, unlockTestApp } from "./testUtils";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("challenge run routes", () => {
  it("returns not found when getting run state for a missing challenge", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request(
        "/api/challenges/missing-challenge/run",
        {
          headers: { cookie },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_not_found",
      });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when updating run state for a missing challenge", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request(
        "/api/challenges/missing-challenge/run",
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: 1 }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_not_found",
      });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when submitting a result for a missing challenge", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request(
        "/api/challenges/missing-challenge/results",
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: "missing-session-card",
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_not_found",
      });
    } finally {
      await cleanup();
    }
  });

  it("gets a persisted challenge run session", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);

      const firstResponse = await app.request(
        `/api/challenges/${challenge.id}/run`,
        { headers: { cookie } },
      );
      expect(firstResponse.status).toBe(200);
      const firstRun = await firstResponse.json();
      expect(firstRun).toMatchObject({
        challengeId: challenge.id,
        status: "active",
        cursor: 0,
      });
      expect(firstRun.cards).toHaveLength(2);
      expect(
        firstRun.cards.map((card: { queueIndex: number }) => card.queueIndex),
      ).toEqual([0, 1]);
      expect(
        firstRun.cards.find(
          (card: { category?: string }) => card.category === "역사",
        ),
      ).toMatchObject({
        category: "역사",
        segments,
        selectedResult: null,
      });

      const secondResponse = await app.request(
        `/api/challenges/${challenge.id}/run`,
        { headers: { cookie } },
      );
      const secondRun = await secondResponse.json();
      expect(secondRun.sessionId).toBe(firstRun.sessionId);
      expect(secondRun.cards).toEqual(firstRun.cards);
    } finally {
      await cleanup();
    }
  });

  it("adds newly synced deck cards to the remaining active run queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { deck, challenge } = await createChallengeFixture(prisma);
      const firstRun = await getRun(app, challenge.id, cookie);
      const currentSessionCardId = firstRun.cards[0].sessionCardId;

      await createCard(prisma, {
        deckId: deck.id,
        category: "신규",
        segments,
      });
      const updateResponse = await app.request(
        `/api/challenges/${challenge.id}/update-from-deck`,
        { method: "POST", headers: { cookie } },
      );

      expect(updateResponse.status).toBe(200);
      await expect(updateResponse.json()).resolves.toEqual({ addedCount: 1 });

      const updatedRun = await getRun(app, challenge.id, cookie);

      expect(updatedRun).toMatchObject({
        sessionId: firstRun.sessionId,
        cursor: 0,
      });
      expect(updatedRun.cards).toHaveLength(3);
      expect(updatedRun.cards[0].sessionCardId).toBe(currentSessionCardId);
      expect(
        updatedRun.cards.map((card: { queueIndex: number }) => card.queueIndex),
      ).toEqual([0, 1, 2]);
      expect(
        updatedRun.cards.find(
          (card: { category?: string }) => card.category === "신규",
        ),
      ).toBeTruthy();
    } finally {
      await cleanup();
    }
  });

  it("marks the challenge completed when starting a run with no due cards", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const challenge = await createChallenge(prisma, {
        name: "빈 챌린지",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });

      const response = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          headers: { cookie },
        },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        challengeId: challenge.id,
        status: "completed",
        cards: [],
      });
      await expect(
        prisma.challenge.findUniqueOrThrow({ where: { id: challenge.id } }),
      ).resolves.toMatchObject({
        status: "completed",
        completedAt: expect.any(Date),
      });
    } finally {
      await cleanup();
    }
  });

  it("reuses a completed run session when no cards are due", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const challenge = await createChallenge(prisma, {
        name: "빈 챌린지",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });

      const firstRun = await getRun(app, challenge.id, cookie);
      const secondRun = await getRun(app, challenge.id, cookie);

      expect(secondRun.sessionId).toBe(firstRun.sessionId);
      await expect(
        prisma.challengeRunSession.count({
          where: { challengeId: challenge.id },
        }),
      ).resolves.toBe(1);
    } finally {
      await cleanup();
    }
  });

  it("does not complete a challenge when cards are scheduled for the future", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await prisma.challengeCardState.updateMany({
        where: { challengeId: challenge.id },
        data: { dueAt: new Date("2999-01-01T00:00:00.000Z") },
      });

      const response = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          headers: { cookie },
        },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        challengeId: challenge.id,
        status: "completed",
        cards: [],
      });
      await expect(
        prisma.challenge.findUniqueOrThrow({ where: { id: challenge.id } }),
      ).resolves.toMatchObject({
        status: "active",
        completedAt: null,
      });
    } finally {
      await cleanup();
    }
  });

  it("keeps challenge cards in an existing run after a source card is deleted", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);

      const sourceSnapshot = await prisma.challengeCard.findUniqueOrThrow({
        where: { id: run.cards[0].challengeCardId },
      });
      await prisma.card.delete({
        where: { id: sourceSnapshot.sourceDeckCardId ?? "missing" },
      });

      const response = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          headers: { cookie },
        },
      );

      expect(response.status).toBe(200);
      const reloadedRun = await response.json();
      expect(reloadedRun.cards).toHaveLength(2);
      expect(reloadedRun.cards[0]).toMatchObject({
        challengeCardId: run.cards[0].challengeCardId,
        segments,
        queueIndex: 0,
      });
    } finally {
      await cleanup();
    }
  });

  it("updates the persisted challenge run cursor", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const updateResponse = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: 1 }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );
      expect(updateResponse.status).toBe(200);
      await expect(updateResponse.json()).resolves.toMatchObject({
        challengeId: challenge.id,
        cursor: 1,
      });

      const reloadedRun = await getRun(app, challenge.id, cookie);
      expect(reloadedRun.cursor).toBe(1);

      const negativeResponse = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: -5 }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );
      expect(negativeResponse.status).toBe(200);
      await expect(negativeResponse.json()).resolves.toMatchObject({
        challengeId: challenge.id,
        cursor: 0,
        status: "active",
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects non-integer challenge run cursors", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: 0.5 }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "cursor_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects non-object challenge run cursor bodies", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          method: "PATCH",
          body: "null",
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "cursor_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when updating a challenge run before it has started", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);

      const response = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: 1 }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "active_challenge_run_not_found",
      });
    } finally {
      await cleanup();
    }
  });

  it("marks the active run session completed when cursor moves past the queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);

      const updateResponse = await app.request(
        `/api/challenges/${challenge.id}/run`,
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: run.cards.length }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(updateResponse.status).toBe(200);
      await expect(updateResponse.json()).resolves.toMatchObject({
        challengeId: challenge.id,
        cursor: run.cards.length,
        status: "completed",
      });
      await expect(
        prisma.challengeRunSession.count({
          where: { challengeId: challenge.id, status: "active" },
        }),
      ).resolves.toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("does not keep an empty active run session when no cards are due", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const { challenge } = await createChallengeFixture(prisma);
      await prisma.challengeCardState.updateMany({
        where: { challengeId: challenge.id },
        data: { dueAt: new Date("2026-07-01T00:00:00.000Z") },
      });

      const earlyRun = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        new Date("2026-06-25T00:00:00.000Z"),
      );
      expect(earlyRun).toMatchObject({
        challengeId: challenge.id,
        status: "completed",
        cards: [],
      });
      await expect(
        prisma.challengeRunSession.count({
          where: { challengeId: challenge.id, status: "active" },
        }),
      ).resolves.toBe(0);

      const dueRun = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        new Date("2026-07-01T00:00:00.000Z"),
      );
      expect(dueRun).toMatchObject({
        challengeId: challenge.id,
        status: "active",
      });
      expect(dueRun.cards).toHaveLength(2);
    } finally {
      await cleanup();
    }
  });

  it("submits a wrong result without moving the card in the active queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);
      const firstSessionCardId = run.cards[0].sessionCardId;

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: firstSessionCardId,
            finalResult: "wrong",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(
        result.runState.cards.map(
          (card: { sessionCardId: string }) => card.sessionCardId,
        ),
      ).toEqual([firstSessionCardId, run.cards[1].sessionCardId]);
      expect(result.runState.cards[0]).toMatchObject({
        sessionCardId: firstSessionCardId,
        selectedResult: "wrong",
      });
      expect(result.progress).toMatchObject({
        totalCards: 2,
        completedCards: 0,
        dueCards: 1,
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects invalid challenge result values", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: run.cards[0].sessionCardId,
            finalResult: "maybe",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_result_fields_required",
      });
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("rejects blank challenge result session card ids", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: "   ",
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_result_fields_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects non-string challenge result session card ids", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: 123,
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_result_fields_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects non-object challenge result bodies", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: "null",
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_result_fields_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when submitting a result before the challenge run starts", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: "missing-session-card",
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "active_challenge_run_not_found",
      });
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("rejects results for cards outside the active challenge run queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: "missing-session-card",
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "session_card_not_found",
      });
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("accepts results after the source deck card is deleted", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);
      const runCard = run.cards[0];
      const sourceSnapshot = await prisma.challengeCard.findUniqueOrThrow({
        where: { id: runCard.challengeCardId },
      });

      await prisma.card.delete({
        where: { id: sourceSnapshot.sourceDeckCardId ?? "missing" },
      });

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: runCard.sessionCardId,
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(200);
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(1);
      await expect(
        prisma.challengeAnswerEvent.findFirstOrThrow(),
      ).resolves.toMatchObject({
        challengeCardId: runCard.challengeCardId,
      });
    } finally {
      await cleanup();
    }
  });

  it("corrects a previous result and recalculates state from the session starting stage", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);
      const sessionCardId = run.cards[0].sessionCardId;

      await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({ sessionCardId, finalResult: "wrong" }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      const correctionResponse = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({ sessionCardId, finalResult: "correct" }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(correctionResponse.status).toBe(200);
      const correction = await correctionResponse.json();
      expect(
        correction.runState.cards.map(
          (card: { sessionCardId: string }) => card.sessionCardId,
        ),
      ).toEqual([sessionCardId, run.cards[1].sessionCardId]);
      expect(correction.runState.cards[0]).toMatchObject({
        sessionCardId,
        selectedResult: "correct",
      });

      const state = await prisma.challengeCardState.findUniqueOrThrow({
        where: {
          id: run.cards[0].stateId,
        },
      });
      expect(state.stage).toBe(1);
      expect(state.result).toBe("correct");
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(2);
    } finally {
      await cleanup();
    }
  });

  it("blocks same-day retries and makes wrong cards available at the next Seoul midnight", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      for (const category of ["퀴즈1", "퀴즈2", "퀴즈3"]) {
        await createCard(prisma, { deckId: deck.id, category, segments });
      }
      const challenge = await createChallenge(prisma, {
        name: "날짜별 복습",
        deckId: deck.id,
        reviewIntervalsDays: [1, 3, 10],
      });
      const firstDay = new Date("2026-08-26T23:00:00.000+09:00");
      const firstRun = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        firstDay,
      );

      await submitChallengeRunResult(prisma, {
        challengeId: challenge.id,
        sessionCardId: findRunCard(firstRun, "퀴즈1").sessionCardId,
        finalResult: "correct",
        now: firstDay,
      });
      for (const category of ["퀴즈2", "퀴즈3"]) {
        await submitChallengeRunResult(prisma, {
          challengeId: challenge.id,
          sessionCardId: findRunCard(firstRun, category).sessionCardId,
          finalResult: "wrong",
          now: firstDay,
        });
      }
      const resumedRun = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        firstDay,
      );
      expect(resumedRun.sessionId).toBe(firstRun.sessionId);
      expect(resumedRun.status).toBe("active");
      await updateChallengeRunCursor(
        prisma,
        {
          challengeId: challenge.id,
          cursor: firstRun.cards.length,
        },
        firstDay,
      );

      const immediateRetry = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        firstDay,
      );
      expect(immediateRetry).toMatchObject({
        sessionId: firstRun.sessionId,
        status: "completed",
      });
      await expect(prisma.challengeRunSession.count()).resolves.toBe(1);
      await expect(
        listChallengeResponses(prisma, firstDay),
      ).resolves.toMatchObject([
        {
          id: challenge.id,
          status: "active",
          dueCount: 0,
          progress: { dueCards: 0, currentStageCounts: { 0: 2, 1: 1 } },
          nextDueAt: "2026-08-26T15:00:00.000Z",
        },
      ]);

      const beforeMidnight = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        new Date("2026-08-26T23:59:59.999+09:00"),
      );
      expect(beforeMidnight.sessionId).toBe(firstRun.sessionId);
      expect(beforeMidnight.status).toBe("completed");

      const secondDay = new Date("2026-08-27T00:00:00.000+09:00");
      await expect(
        listChallengeResponses(prisma, secondDay),
      ).resolves.toMatchObject([{ id: challenge.id, dueCount: 3 }]);
      const secondDayRun = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        secondDay,
      );
      expect(secondDayRun.sessionId).not.toBe(firstRun.sessionId);
      expect(secondDayRun.status).toBe("active");
      expect(secondDayRun.cards.map((card) => card.category).sort()).toEqual([
        "퀴즈1",
        "퀴즈2",
        "퀴즈3",
      ]);

      for (const category of ["퀴즈1", "퀴즈2"]) {
        await submitChallengeRunResult(prisma, {
          challengeId: challenge.id,
          sessionCardId: findRunCard(secondDayRun, category).sessionCardId,
          finalResult: "correct",
          now: secondDay,
        });
      }
      await submitChallengeRunResult(prisma, {
        challengeId: challenge.id,
        sessionCardId: findRunCard(secondDayRun, "퀴즈3").sessionCardId,
        finalResult: "wrong",
        now: secondDay,
      });

      const statesAfterSecondDay = await prisma.challengeCardState.findMany({
        where: { challengeId: challenge.id },
        include: { challengeCard: true },
      });
      expect(
        statesAfterSecondDay.map((state) => ({
          category: state.challengeCard.category,
          stage: state.stage,
          dueAt: state.dueAt,
        })),
      ).toEqual(
        expect.arrayContaining([
          {
            category: "퀴즈1",
            stage: 2,
            dueAt: new Date("2026-08-30T00:00:00.000+09:00"),
          },
          {
            category: "퀴즈2",
            stage: 1,
            dueAt: new Date("2026-08-28T00:00:00.000+09:00"),
          },
          {
            category: "퀴즈3",
            stage: 0,
            dueAt: new Date("2026-08-28T00:00:00.000+09:00"),
          },
        ]),
      );

      await updateChallengeRunCursor(
        prisma,
        {
          challengeId: challenge.id,
          cursor: secondDayRun.cards.length,
        },
        secondDay,
      );
      const fourthDay = new Date("2026-08-30T10:00:00.000+09:00");
      const fourthDayRun = await getOrCreateChallengeRunState(
        prisma,
        challenge.id,
        fourthDay,
      );
      await submitChallengeRunResult(prisma, {
        challengeId: challenge.id,
        sessionCardId: findRunCard(fourthDayRun, "퀴즈1").sessionCardId,
        finalResult: "wrong",
        now: fourthDay,
      });

      await expect(
        prisma.challengeCardState.findUniqueOrThrow({
          where: {
            id: findRunCard(fourthDayRun, "퀴즈1").stateId,
          },
        }),
      ).resolves.toMatchObject({
        stage: 0,
        dueAt: new Date("2026-08-31T00:00:00.000+09:00"),
        completedAt: null,
        result: "wrong",
      });
    } finally {
      await cleanup();
    }
  });

  it.each(["correct", "wrong"] as const)(
    "blocks a finished %s run through the API even with newly synced or legacy due cards",
    async (finalResult) => {
      const { prisma, cleanup } = await createTestPrisma();

      try {
        const app = createApp({ prisma, env: testEnv });
        const cookie = await unlockTestApp(app);
        const { deck, challenge } = await createChallengeFixture(prisma);
        const firstRun = await getRun(app, challenge.id, cookie);

        for (const card of firstRun.cards) {
          await submitChallengeRunResult(prisma, {
            challengeId: challenge.id,
            sessionCardId: card.sessionCardId,
            finalResult,
          });
        }
        await updateChallengeRunCursor(prisma, {
          challengeId: challenge.id,
          cursor: firstRun.cards.length,
        });

        if (finalResult === "wrong") {
          // Wrong answers saved before this change have no scheduled date.
          await prisma.challengeCardState.updateMany({
            where: { challengeId: challenge.id },
            data: { dueAt: null },
          });
        }

        await createCard(prisma, {
          deckId: deck.id,
          category: "신규",
          segments,
        });
        const syncResponse = await app.request(
          `/api/challenges/${challenge.id}/update-from-deck`,
          { method: "POST", headers: { cookie } },
        );
        expect(syncResponse.status).toBe(200);
        const listResponse = await app.request("/api/challenges", {
          headers: { cookie },
        });
        await expect(listResponse.json()).resolves.toMatchObject([
          { id: challenge.id, dueCount: 0, progress: { dueCards: 0 } },
        ]);

        const retry = await getRun(app, challenge.id, cookie);
        expect(retry).toMatchObject({
          sessionId: firstRun.sessionId,
          status: "completed",
        });
        const resultResponse = await app.request(
          `/api/challenges/${challenge.id}/results`,
          {
            method: "POST",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({
              sessionCardId: firstRun.cards[0].sessionCardId,
              finalResult: "correct",
            }),
          },
        );
        expect(resultResponse.status).toBe(404);
        await expect(resultResponse.json()).resolves.toEqual({
          error: "active_challenge_run_not_found",
        });
        await expect(prisma.challengeRunSession.count()).resolves.toBe(1);

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const nextRun = await getOrCreateChallengeRunState(
          prisma,
          challenge.id,
          tomorrow,
        );
        expect(nextRun.status).toBe("active");
        expect(nextRun.sessionId).not.toBe(firstRun.sessionId);
        expect(nextRun.cards).toHaveLength(finalResult === "wrong" ? 3 : 1);
      } finally {
        await cleanup();
      }
    },
  );

  it("completes the challenge when every card state is completed", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      await createCard(prisma, { deckId: deck.id, category: "역사", segments });
      const challenge = await createChallenge(prisma, {
        name: "최종 복습",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });
      await prisma.challengeCardState.updateMany({
        where: { challengeId: challenge.id },
        data: { stage: 3 },
      });
      const run = await getRun(app, challenge.id, cookie);

      const response = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionCardId: run.cards[0].sessionCardId,
            finalResult: "correct",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(response.status).toBe(200);
      const updatedChallenge = await prisma.challenge.findUniqueOrThrow({
        where: { id: challenge.id },
      });
      expect(updatedChallenge.status).toBe("completed");
      expect(updatedChallenge.completedAt).toEqual(expect.any(Date));
    } finally {
      await cleanup();
    }
  });

  it("reactivates a completed challenge when a final answer is corrected to wrong", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      await createCard(prisma, { deckId: deck.id, segments });
      const challenge = await createChallenge(prisma, {
        name: "최종 복습",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });
      await prisma.challengeCardState.updateMany({
        where: { challengeId: challenge.id },
        data: { stage: 3 },
      });
      const run = await getRun(app, challenge.id, cookie);
      const sessionCardId = run.cards[0].sessionCardId;

      await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({ sessionCardId, finalResult: "correct" }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      await expect(
        prisma.challenge.findUniqueOrThrow({ where: { id: challenge.id } }),
      ).resolves.toMatchObject({
        status: "completed",
        completedAt: expect.any(Date),
      });
      const correctionResponse = await app.request(
        `/api/challenges/${challenge.id}/results`,
        {
          method: "POST",
          body: JSON.stringify({ sessionCardId, finalResult: "wrong" }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );

      expect(correctionResponse.status).toBe(200);
      const updatedChallenge = await prisma.challenge.findUniqueOrThrow({
        where: { id: challenge.id },
      });
      expect(updatedChallenge.status).toBe("active");
      expect(updatedChallenge.completedAt).toBeNull();
    } finally {
      await cleanup();
    }
  });
});

async function createChallengeFixture(
  prisma: Awaited<ReturnType<typeof createTestPrisma>>["prisma"],
) {
  const deck = await prisma.deck.create({ data: { title: "국어" } });
  await createCard(prisma, { deckId: deck.id, category: "역사", segments });
  await createCard(prisma, { deckId: deck.id, segments });
  const challenge = await createChallenge(prisma, {
    name: "중간고사",
    deckId: deck.id,
    reviewIntervalsDays: [3, 5, 10],
  });

  return { deck, challenge };
}

async function getRun(
  app: ReturnType<typeof createApp>,
  challengeId: string,
  cookie: string,
) {
  const response = await app.request(`/api/challenges/${challengeId}/run`, {
    headers: { cookie },
  });

  expect(response.status).toBe(200);

  return response.json();
}

function findRunCard(run: ChallengeRunState, category: string) {
  const card = run.cards.find((candidate) => candidate.category === category);

  if (!card) {
    throw new Error(`Challenge run card not found: ${category}`);
  }

  return card;
}
