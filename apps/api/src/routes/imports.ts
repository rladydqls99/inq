import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import { parseMarkdownImport } from "@inq/shared";
import {
  confirmMarkdownImport,
} from "../services/importService";

export function createImportRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.post("/markdown/preview", async (context) => {
    const body = await context.req.json();
    const markdown = readField(body, "markdown");

    if (typeof markdown !== "string") {
      return context.json({ error: "markdown_required" }, 400);
    }

    return context.json(parseMarkdownImport(markdown));
  });

  route.post("/markdown/confirm", async (context) => {
    const body = await context.req.json();
    const deckId = trimmedString(readField(body, "deckId"));
    const markdown = readField(body, "markdown");

    if (!deckId || typeof markdown !== "string") {
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
      markdown,
    });

    if (!result.ok) {
      return context.json(result.preview, 400);
    }

    return context.json({ createdCount: result.createdCount }, 201);
  });

  return route;
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[field];
}
