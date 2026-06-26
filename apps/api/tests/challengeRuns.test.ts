import { describe, expect, it } from "vitest";

import { createCard } from "@inq/db/repositories/cards";
import { createChallenge } from "@inq/db/repositories/challenges";
import type { QuizSegment } from "@inq/shared";
import { createApp } from "../src/app";
import { createTestPrisma, testEnv, unlockTestApp } from "./testUtils";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("challenge run routes", () => {
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
