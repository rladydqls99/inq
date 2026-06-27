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
  it("returns not found when getting run state for a missing deck", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/decks/missing-deck/run", {
        headers: { cookie },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "deck_not_found" });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when updating run state for a missing deck", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/decks/missing-deck/run", {
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "deck_not_found" });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when restarting run state for a missing deck", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request(
        "/api/decks/missing-deck/run/restart",
        {
          method: "POST",
          headers: { cookie },
        },
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({ error: "deck_not_found" });
    } finally {
      await cleanup();
    }
  });

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

      const overflowResponse = await app.request(`/api/decks/${deck.id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: 99 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(overflowResponse.status).toBe(200);
      await expect(overflowResponse.json()).resolves.toMatchObject({
        deckId: deck.id,
        cursor: 1,
        completedAt: expect.any(String),
      });

      const negativeResponse = await app.request(`/api/decks/${deck.id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: -5 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(negativeResponse.status).toBe(200);
      await expect(negativeResponse.json()).resolves.toMatchObject({
        deckId: deck.id,
        cursor: 0,
        completedAt: null,
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

  it("clamps deck run state when cards are deleted after progress is saved", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const firstCard = await createCard(prisma, { deckId: deck.id, segments });
      await createCard(prisma, { deckId: deck.id, segments });

      const patchResponse = await app.request(`/api/decks/${deck.id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: 2 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(patchResponse.status).toBe(200);

      await prisma.card.delete({ where: { id: firstCard.id } });

      const getResponse = await app.request(`/api/decks/${deck.id}/run`, {
        headers: { cookie },
      });

      expect(getResponse.status).toBe(200);
      await expect(getResponse.json()).resolves.toMatchObject({
        deckId: deck.id,
        cursor: 1,
        completedAt: expect.any(String),
      });
    } finally {
      await cleanup();
    }
  });
});
