import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import {
  createDeck,
  deleteDeck,
  listDecks,
  renameDeck,
} from "@inq/db/repositories/decks";
import type { DeckResponse } from "@inq/shared";

export function createDeckRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/", async (context) => {
    const decks = await listDecks(options.prisma);
    return context.json(decks.map(toDeckResponse));
  });

  route.post("/", async (context) => {
    const body = await context.req.json<{ title?: string }>();
    const title = body.title?.trim();

    if (!title) {
      return context.json({ error: "title_required" }, 400);
    }

    const deck = await createDeck(options.prisma, { title });

    return context.json(
      toDeckResponse({
        ...deck,
        cardCount: 0,
      }),
      201,
    );
  });

  route.patch("/:deckId", async (context) => {
    const body = await context.req.json<{ title?: string }>();
    const title = body.title?.trim();

    if (!title) {
      return context.json({ error: "title_required" }, 400);
    }

    const deckId = context.req.param("deckId");
    const exists = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!exists) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    const deck = await renameDeck(options.prisma, deckId, {
      title,
    });
    const cardCount = await options.prisma.card.count({
      where: { deckId: deck.id },
    });

    return context.json(toDeckResponse({ ...deck, cardCount }));
  });

  route.delete("/:deckId", async (context) => {
    await deleteDeck(options.prisma, context.req.param("deckId"));

    return context.body(null, 204);
  });

  return route;
}

function toDeckResponse(deck: {
  id: string;
  title: string;
  cardCount: number;
  createdAt: Date;
  updatedAt: Date;
}): DeckResponse {
  return {
    id: deck.id,
    title: deck.title,
    cardCount: deck.cardCount,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  };
}
