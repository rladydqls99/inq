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

describe("backup routes", () => {
  it("exports learning data and excludes PIN hash", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const card = await createCard(prisma, { deckId: deck.id, segments });
      const challenge = await createChallenge(prisma, {
        name: "중간고사",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });
      await app.request(`/api/challenges/${challenge.id}/run`, {
        headers: { cookie },
      });
      await app.request(`/api/decks/${deck.id}/run`, {
        headers: { cookie },
      });

      const response = await app.request("/api/backup/export", {
        headers: { cookie },
      });

      expect(response.status).toBe(200);
      const backup = await response.json();
      expect(backup).toMatchObject({
        exportedAt: expect.any(String),
        decks: [{ id: deck.id, title: "국어" }],
        cards: [{ id: card.id, deckId: deck.id, segments }],
        challenges: [{ id: challenge.id, name: "중간고사" }],
      });
      expect(backup.challengeCardStates).toHaveLength(1);
      expect(backup.challengeRunSessions).toHaveLength(1);
      expect(backup.deckRunStates).toHaveLength(1);
      expect(JSON.stringify(backup)).not.toContain("pinHash");
      expect(JSON.stringify(backup)).not.toContain("scrypt:");
    } finally {
      await cleanup();
    }
  });

  it("excludes deleted cards from exported challenge run queues", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const card = await createCard(prisma, { deckId: deck.id, segments });
      const challenge = await createChallenge(prisma, {
        name: "중간고사",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });

      await app.request(`/api/challenges/${challenge.id}/run`, {
        headers: { cookie },
      });
      await app.request(`/api/challenges/${challenge.id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      await prisma.card.delete({ where: { id: card.id } });

      const response = await app.request("/api/backup/export", {
        headers: { cookie },
      });

      expect(response.status).toBe(200);
      const backup = await response.json();
      expect(backup.challengeRunSessions).toHaveLength(1);
      expect(backup.challengeRunSessions[0].status).toBe("completed");
      expect(backup.challengeRunSessions[0].cursor).toBe(0);
      expect(backup.challengeRunSessions[0].completedAt).toEqual(expect.any(String));
      expect(backup.challengeRunSessions[0].queue).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("marks exported challenge run complete when deleted cards empty an active queue", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const card = await createCard(prisma, { deckId: deck.id, segments });
      const challenge = await createChallenge(prisma, {
        name: "중간고사",
        deckId: deck.id,
        reviewIntervalsDays: [3, 5, 10],
      });

      await app.request(`/api/challenges/${challenge.id}/run`, {
        headers: { cookie },
      });
      await prisma.card.delete({ where: { id: card.id } });

      const response = await app.request("/api/backup/export", {
        headers: { cookie },
      });

      expect(response.status).toBe(200);
      const backup = await response.json();
      expect(backup.challengeRunSessions).toHaveLength(1);
      expect(backup.challengeRunSessions[0]).toMatchObject({
        status: "completed",
        cursor: 0,
        completedAt: expect.any(String),
        queue: [],
      });
    } finally {
      await cleanup();
    }
  });
});
