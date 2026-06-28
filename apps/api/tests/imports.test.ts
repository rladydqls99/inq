import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { createTestPrisma, testEnv, unlockTestApp } from "./testUtils";

describe("markdown import routes", () => {
  it("previews markdown quiz cards", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/import/markdown/preview", {
        method: "POST",
        body: JSON.stringify({
          markdown: "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        parsed: 1,
        errors: [],
        previewCards: [
          {
            blockIndex: 0,
            segments: [
              { type: "text", value: "훈민정음을 만든 " },
              { type: "answer", value: "조선" },
              { type: "text", value: "의 왕은 " },
              { type: "answer", value: "세종대왕" },
              { type: "text", value: "이다." },
            ],
          },
        ],
      });
    } finally {
      await cleanup();
    }
  });

  it("confirms markdown by revalidating the original markdown and creating cards", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);
      const deck = await prisma.deck.create({ data: { title: "국어" } });

      const response = await app.request("/api/import/markdown/confirm", {
        method: "POST",
        body: JSON.stringify({
          deckId: deck.id,
          markdown: "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ createdCount: 1 });
      await expect(prisma.card.count({ where: { deckId: deck.id } })).resolves.toBe(
        1,
      );

      const invalidResponse = await app.request(
        "/api/import/markdown/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            deckId: deck.id,
            markdown: "정답 괄호가 없다.",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
          },
        },
      );
      expect(invalidResponse.status).toBe(400);
      await expect(prisma.card.count({ where: { deckId: deck.id } })).resolves.toBe(
        1,
      );
    } finally {
      await cleanup();
    }
  });

  it("rejects markdown confirm when the target deck does not exist", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/import/markdown/confirm", {
        method: "POST",
        body: JSON.stringify({
          deckId: "missing-deck",
          markdown: "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.",
        }),
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

  it("rejects markdown confirm when deck id is blank", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/import/markdown/confirm", {
        method: "POST",
        body: JSON.stringify({
          deckId: "   ",
          markdown: "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "import_fields_required",
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects markdown confirm when deck id is not a string", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({ prisma, env: testEnv });
      const cookie = await unlockTestApp(app);

      const response = await app.request("/api/import/markdown/confirm", {
        method: "POST",
        body: JSON.stringify({
          deckId: 123,
          markdown: "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
        },
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "import_fields_required",
      });
    } finally {
      await cleanup();
    }
  });
});
