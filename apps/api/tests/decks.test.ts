import { describe, expect, it } from "vitest";

import { createCard } from "@inq/db/repositories/cards";
import type { QuizSegment } from "@inq/shared";
import { createApp } from "../src/app";
import { createTestPrisma, unlockTestApp } from "./testUtils";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("deck and card routes", () => {
  it("rejects unauthenticated deck requests", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const response = await app.request("/api/decks");

      expect(response.status).toBe(401);
    } finally {
      await cleanup();
    }
  });

  it("creates, lists, renames, and deletes decks", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);

      const createResponse = await app.request("/api/decks", {
        method: "POST",
        body: JSON.stringify({ title: "국어" }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();
      expect(created).toMatchObject({
        title: "국어",
        cardCount: 0,
      });
      expect(created.createdAt).toEqual(expect.any(String));

      const listResponse = await app.request("/api/decks", {
        headers: { cookie },
      });
      expect(listResponse.status).toBe(200);
      await expect(listResponse.json()).resolves.toMatchObject([
        { id: created.id, title: "국어", cardCount: 0 },
      ]);

      const renameResponse = await app.request(`/api/decks/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "한국어" }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(renameResponse.status).toBe(200);
      await expect(renameResponse.json()).resolves.toMatchObject({
        id: created.id,
        title: "한국어",
      });

      const deleteResponse = await app.request(`/api/decks/${created.id}`, {
        method: "DELETE",
        headers: { cookie },
      });
      expect(deleteResponse.status).toBe(204);

      const emptyListResponse = await app.request("/api/decks", {
        headers: { cookie },
      });
      await expect(emptyListResponse.json()).resolves.toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("trims deck titles and rejects blank titles", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);

      const createResponse = await app.request("/api/decks", {
        method: "POST",
        body: JSON.stringify({ title: "  국어  " }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(createResponse.status).toBe(201);
      const created = await createResponse.json();
      expect(created.title).toBe("국어");

      const renameResponse = await app.request(`/api/decks/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "   " }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });
      expect(renameResponse.status).toBe(400);
      await expect(renameResponse.json()).resolves.toEqual({
        error: "title_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("returns not found when renaming a missing deck", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/decks/missing-deck", {
        method: "PATCH",
        body: JSON.stringify({ title: "한국어" }),
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

  it("lists, reads, and updates card segments", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv() });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });
      const card = await createCard(prisma, {
        deckId: deck.id,
        segments,
      });

      const listResponse = await app.request(`/api/decks/${deck.id}/cards`, {
        headers: { cookie },
      });
      expect(listResponse.status).toBe(200);
      await expect(listResponse.json()).resolves.toMatchObject([
        {
          id: card.id,
          deckId: deck.id,
          segments,
          version: 1,
        },
      ]);

      const getResponse = await app.request(`/api/cards/${card.id}`, {
        headers: { cookie },
      });
      expect(getResponse.status).toBe(200);
      await expect(getResponse.json()).resolves.toMatchObject({
        id: card.id,
        deckId: deck.id,
        segments,
        version: 1,
      });

      const nextSegments: QuizSegment[] = [
        { type: "text", value: "수정된 " },
        { type: "answer", id: "answer-1", value: "정답" },
      ];
      const updateResponse = await app.request(`/api/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ segments: nextSegments, version: 1 }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(updateResponse.status).toBe(200);
      await expect(updateResponse.json()).resolves.toMatchObject({
        id: card.id,
        segments: nextSegments,
        version: 2,
      });

      for (const invalidSegments of [
        [{ type: "text", value: "정답 없는 카드" }],
        [{ type: "answer", id: "answer-1", value: "" }],
      ]) {
        const invalidResponse = await app.request(`/api/cards/${card.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            segments: invalidSegments,
            version: 2,
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        });
        expect(invalidResponse.status).toBe(400);
        await expect(invalidResponse.json()).resolves.toEqual({
          error: "invalid_card_segments",
        });
      }

      const deleteResponse = await app.request(`/api/cards/${card.id}`, {
        method: "DELETE",
        headers: { cookie },
      });
      expect(deleteResponse.status).toBe(204);
      await expect(prisma.card.count({ where: { id: card.id } })).resolves.toBe(
        0,
      );
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
