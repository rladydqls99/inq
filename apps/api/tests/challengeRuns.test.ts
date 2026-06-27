import { describe, expect, it } from "vitest";

import { createCard } from "@inq/db/repositories/cards";
import { createChallenge } from "@inq/db/repositories/challenges";
import type { QuizSegment } from "@inq/shared";
import { createApp } from "../src/app";
import { getOrCreateChallengeRunState } from "../src/services/challengeRunService";
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

      const response = await app.request("/api/challenges/missing-challenge/run", {
        headers: { cookie },
      });

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

      const response = await app.request("/api/challenges/missing-challenge/run", {
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

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
      expect(firstRun.cards[0]).toMatchObject({
        segments,
        queueIndex: 0,
        selectedResult: null,
      });

      const secondResponse = await app.request(
        `/api/challenges/${challenge.id}/run`,
        { headers: { cookie } },
      );
      const secondRun = await secondResponse.json();
      expect(secondRun.sessionId).toBe(firstRun.sessionId);
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

      const response = await app.request(`/api/challenges/${challenge.id}/run`, {
        headers: { cookie },
      });

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

      const response = await app.request(`/api/challenges/${challenge.id}/run`, {
        headers: { cookie },
      });

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

  it("omits deleted cards from an existing challenge run session", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);

      await prisma.card.delete({ where: { id: run.cards[0].cardId } });

      const response = await app.request(`/api/challenges/${challenge.id}/run`, {
        headers: { cookie },
      });

      expect(response.status).toBe(200);
      const reloadedRun = await response.json();
      expect(reloadedRun.cards).toHaveLength(1);
      expect(reloadedRun.cards[0]).toMatchObject({
        cardId: run.cards[1].cardId,
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

  it("returns not found when updating a challenge run before it has started", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);

      const response = await app.request(`/api/challenges/${challenge.id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

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

  it("submits a wrong result and moves the card to the back of the active queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);
      const firstSessionCardId = run.cards[0].sessionCardId;

      const response = await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: firstSessionCardId,
          finalResult: "wrong",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.runState.cards.map((card: { sessionCardId: string }) => card.sessionCardId)).toEqual([
        run.cards[1].sessionCardId,
        firstSessionCardId,
      ]);
      expect(result.runState.cards[1]).toMatchObject({
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

      const response = await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: run.cards[0].sessionCardId,
          finalResult: "maybe",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "challenge_result_fields_required",
      });
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(0);
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

      const response = await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: "missing-session-card",
          finalResult: "correct",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

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

      const response = await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: "missing-session-card",
          finalResult: "correct",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "session_card_not_found",
      });
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("rejects results for deleted cards in an existing challenge run queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const { challenge } = await createChallengeFixture(prisma);
      const run = await getRun(app, challenge.id, cookie);
      const deletedCard = run.cards[0];

      await prisma.card.delete({ where: { id: deletedCard.cardId } });

      const response = await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: deletedCard.sessionCardId,
          finalResult: "correct",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "session_card_not_found",
      });
      await expect(prisma.challengeAnswerEvent.count()).resolves.toBe(0);
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
      ).toEqual([run.cards[1].sessionCardId, sessionCardId]);
      expect(correction.runState.cards[1]).toMatchObject({
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

  it("completes the challenge when every card state is completed", async () => {
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

      const response = await app.request(`/api/challenges/${challenge.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: run.cards[0].sessionCardId,
          finalResult: "correct",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

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

async function createChallengeFixture(prisma: Awaited<ReturnType<typeof createTestPrisma>>["prisma"]) {
  const deck = await prisma.deck.create({ data: { title: "국어" } });
  await createCard(prisma, { deckId: deck.id, segments });
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
