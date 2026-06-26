import { describe, expect, it } from "vitest";

import { createCard } from "@inq/db/repositories/cards";
import { createChallenge } from "@inq/db/repositories/challenges";
import type { QuizSegment } from "@inq/shared";
import { createApp } from "../src/app";
import { createTestPrisma, unlockTestApp } from "./testUtils";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("challenge routes", () => {
  it("lists, creates, updates, updates from deck, and deletes challenges", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      await createCard(prisma, { deckId: deck.id, segments });

      const createResponse = await app.request("/api/challenges", {
        method: "POST",
        body: JSON.stringify({
          name: "중간고사",
          deckId: deck.id,
          reviewIntervalsDays: [3, 5, 10],
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();
      expect(created).toMatchObject({
        name: "중간고사",
        deckId: deck.id,
        deckTitle: "국어",
        status: "active",
        answerMode: "manual",
        reviewIntervalsDays: [3, 5, 10],
        maxStage: 3,
        dueCount: 1,
        progress: {
          totalCards: 1,
          completedCards: 0,
          dueCards: 1,
          currentStageCounts: { 0: 1 },
        },
      });

      const listResponse = await app.request("/api/challenges", {
        headers: { cookie },
      });
      expect(listResponse.status).toBe(200);
      await expect(listResponse.json()).resolves.toMatchObject([
        { id: created.id, name: "중간고사" },
      ]);

      const patchResponse = await app.request(`/api/challenges/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "기말고사" }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(patchResponse.status).toBe(200);
      await expect(patchResponse.json()).resolves.toMatchObject({
        id: created.id,
        name: "기말고사",
      });

      await createCard(prisma, { deckId: deck.id, segments });
      const updateFromDeckResponse = await app.request(
        `/api/challenges/${created.id}/update`,
        {
          method: "POST",
          headers: { cookie },
        },
      );
      expect(updateFromDeckResponse.status).toBe(200);
      await expect(updateFromDeckResponse.json()).resolves.toEqual({
        addedCount: 1,
      });

      const deleteResponse = await app.request(`/api/challenges/${created.id}`, {
        method: "DELETE",
        headers: { cookie },
      });
      expect(deleteResponse.status).toBe(204);

      const emptyListResponse = await app.request("/api/challenges", {
        headers: { cookie },
      });
      await expect(emptyListResponse.json()).resolves.toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("lists challenges by nearest due date first", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      await createCard(prisma, { deckId: deck.id, segments });
      const later = await createChallenge(prisma, {
        name: "나중",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });
      const sooner = await createChallenge(prisma, {
        name: "먼저",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });

      await prisma.challengeCardState.updateMany({
        where: { challengeId: later.id },
        data: { dueAt: new Date("2026-07-10T00:00:00.000Z") },
      });
      await prisma.challengeCardState.updateMany({
        where: { challengeId: sooner.id },
        data: { dueAt: new Date("2026-07-01T00:00:00.000Z") },
      });

      const listResponse = await app.request("/api/challenges", {
        headers: { cookie },
      });

      expect(listResponse.status).toBe(200);
      const challenges = await listResponse.json();
      expect(
        challenges.map((challenge: { name: string }) => challenge.name),
      ).toEqual(["먼저", "나중"]);
    } finally {
      await cleanup();
    }
  });

  it("rejects missing or invalid review intervals", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });

      for (const reviewIntervalsDays of [[], [0, 3], [3, -1], [Number.NaN]]) {
        const response = await app.request("/api/challenges", {
          method: "POST",
          body: JSON.stringify({
            name: "잘못된 챌린지",
            deckId: deck.id,
            reviewIntervalsDays,
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        });

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
          error: "invalid_review_intervals",
        });
      }

      await createCard(prisma, { deckId: deck.id, segments });
      const challenge = await createChallenge(prisma, {
        name: "기존 챌린지",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });
      const patchResponse = await app.request(`/api/challenges/${challenge.id}`, {
        method: "PATCH",
        body: JSON.stringify({ reviewIntervalsDays: [] }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(patchResponse.status).toBe(400);
      await expect(patchResponse.json()).resolves.toEqual({
        error: "invalid_review_intervals",
      });
    } finally {
      await cleanup();
    }
  });

  it("reactivates a completed challenge when new deck cards are added", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      await createCard(prisma, { deckId: deck.id, segments });
      const challenge = await createChallenge(prisma, {
        name: "복습 완료",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: {
          status: "completed",
          completedAt: new Date("2026-06-25T00:00:00.000Z"),
        },
      });
      await prisma.challengeCardState.updateMany({
        where: { challengeId: challenge.id },
        data: { completedAt: new Date("2026-06-25T00:00:00.000Z") },
      });
      await createCard(prisma, { deckId: deck.id, segments });

      const updateResponse = await app.request(
        `/api/challenges/${challenge.id}/update`,
        {
          method: "POST",
          headers: { cookie },
        },
      );

      expect(updateResponse.status).toBe(200);
      await expect(updateResponse.json()).resolves.toEqual({ addedCount: 1 });
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
});

function testEnv() {
  return {
    sessionSecret: "test-secret",
    pinSessionTtlSeconds: 60,
  };
}
