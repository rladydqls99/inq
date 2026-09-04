import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import {
  createDeck,
  getDeck,
  listDecks,
  updateDeck,
} from "@inq/db/repositories/decks";
import type { DeckResponse } from "@inq/shared";

const MAX_DESCRIPTION_LENGTH = 500;

export function createDeckRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/", async (context) => {
    const decks = await listDecks(options.prisma);
    return context.json(decks.map(toDeckResponse));
  });

  route.get("/:deckId", async (context) => {
    const deck = await getDeck(options.prisma, context.req.param("deckId"));

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    return context.json(toDeckResponse(deck));
  });

  route.post("/", async (context) => {
    const body = await context.req.json();
    const title = trimmedString(readField(body, "title"));
    const description = optionalDescription(readField(body, "description"));

    if (!title) {
      return context.json({ error: "title_required" }, 400);
    }

    if (!description.valid) {
      return context.json({ error: description.error }, 400);
    }

    const deck = await createDeck(options.prisma, {
      title,
      description: description.value,
    });

    return context.json(
      toDeckResponse({
        ...deck,
        cardCount: 0,
        challengeCount: 0,
      }),
      201,
    );
  });

  route.patch("/:deckId", async (context) => {
    const body = await context.req.json();
    const titleValue = readField(body, "title");
    const descriptionValue = readField(body, "description");
    const hasTitle = titleValue !== undefined;
    const hasDescription = descriptionValue !== undefined;

    if (!hasTitle && !hasDescription) {
      return context.json({ error: "deck_update_fields_required" }, 400);
    }

    const title = hasTitle ? trimmedString(titleValue) : undefined;
    if (hasTitle && !title) {
      return context.json({ error: "title_required" }, 400);
    }

    const description = optionalDescription(descriptionValue);
    if (hasDescription && !description.valid) {
      return context.json({ error: description.error }, 400);
    }

    const deckId = context.req.param("deckId");
    const exists = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!exists) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    const deck = await updateDeck(options.prisma, deckId, {
      ...(title ? { title } : {}),
      ...(hasDescription && description.valid
        ? { description: description.value }
        : {}),
    });
    const [cardCount, challengeCount] = await Promise.all([
      options.prisma.card.count({ where: { deckId: deck.id } }),
      options.prisma.challenge.count({
        where: { sourceDeckId: deck.id },
      }),
    ]);

    return context.json(toDeckResponse({ ...deck, cardCount, challengeCount }));
  });

  route.delete("/:deckId", async (context) => {
    const result = await options.prisma.deck.deleteMany({
      where: { id: context.req.param("deckId") },
    });

    if (result.count === 0) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    return context.body(null, 204);
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

function optionalDescription(
  value: unknown,
):
  | { valid: true; value: string | null }
  | { valid: false; error: "description_invalid" | "description_too_long" } {
  if (value === undefined || value === null) {
    return { valid: true, value: null };
  }

  if (typeof value !== "string") {
    return { valid: false, error: "description_invalid" };
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    return { valid: false, error: "description_too_long" };
  }

  return { valid: true, value: trimmed || null };
}

function readField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[field];
}

function toDeckResponse(deck: {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  challengeCount: number;
  createdAt: Date;
  updatedAt: Date;
}): DeckResponse {
  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    cardCount: deck.cardCount,
    challengeCount: deck.challengeCount,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}
