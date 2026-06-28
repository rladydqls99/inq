import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import {
  confirmMarkdownImport,
  previewMarkdownImport,
} from "../services/importService";

export function createImportRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.post("/markdown/preview", async (context) => {
    const body = await context.req.json<{ markdown?: string }>();

    if (typeof body.markdown !== "string") {
      return context.json({ error: "markdown_required" }, 400);
    }

    return context.json(previewMarkdownImport(body.markdown));
  });

  route.post("/markdown/confirm", async (context) => {
    const body = await context.req.json<{ deckId?: string; markdown?: string }>();
    const deckId = body.deckId?.trim();

    if (!deckId || typeof body.markdown !== "string") {
      return context.json({ error: "import_fields_required" }, 400);
    }

    const deck = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    const result = await confirmMarkdownImport(options.prisma, {
      deckId,
      markdown: body.markdown,
    });

    if (!result.ok) {
      return context.json(result.preview, 400);
    }

    return context.json({ createdCount: result.createdCount }, 201);
  });

  return route;
}
