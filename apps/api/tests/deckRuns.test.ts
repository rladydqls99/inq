import { describe, expect, it } from "vitest";

import { createCard } from "@inq/db/repositories/cards";
import type { QuizSegment } from "@inq/shared";
import { createApp } from "../src/app";
import { createTestPrisma, testEnv, unlockTestApp } from "./testUtils";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("deck run routes", () => {
  it("gets, updates, and restarts deck run state", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const card = await createCard(prisma, { deckId: deck.id, segments });

      const getResponse = await app.request(`/api/decks/${deck.id}/run`, {
        headers: { cookie },
      });
      expect(getResponse.status).toBe(200);
      await expect(getResponse.json()).resolves.toMatchObject({
        deckId: deck.id,
        cursor: 0,
        completedAt: null,
        cards: [{ cardId: card.id, segments }],
      });

      const patchResponse = await app.request(`/api/decks/${deck.id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(patchResponse.status).toBe(200);
      await expect(patchResponse.json()).resolves.toMatchObject({
        deckId: deck.id,
        cursor: 1,
        completedAt: expect.any(String),
      });

      const restartResponse = await app.request(
        `/api/decks/${deck.id}/run/restart`,
        {
          method: "POST",
          headers: { cookie },
        },
      );
      expect(restartResponse.status).toBe(200);
      await expect(restartResponse.json()).resolves.toMatchObject({
        deckId: deck.id,
        cursor: 0,
        completedAt: null,
      });
    } finally {
      await cleanup();
    }
  });
});
