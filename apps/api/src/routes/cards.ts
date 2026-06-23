import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import { listCardsByDeck, updateCard } from "@inq/db/repositories/cards";
import type { CardResponse, QuizSegment } from "@inq/shared";

export function createCardRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/decks/:deckId/cards", async (context) => {
    const cards = await listCardsByDeck(options.prisma, context.req.param("deckId"));

    return context.json(cards.map(toCardResponse));
  });

  route.patch("/cards/:cardId", async (context) => {
    const body = await context.req.json<{
      segments?: QuizSegment[];
      version?: number;
    }>();

    if (!body.segments || typeof body.version !== "number") {
      return context.json({ error: "card_update_fields_required" }, 400);
    }

    const card = await updateCard(options.prisma, context.req.param("cardId"), {
      segments: body.segments,
      version: body.version,
    });

    return context.json(toCardResponse(card));
  });

  return route;
}

function toCardResponse(card: {
  id: string;
  deckId: string;
  segments: unknown;
  studyViewCount: number;
  lastStudiedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): CardResponse {
  return {
    id: card.id,
    deckId: card.deckId,
    segments: card.segments as QuizSegment[],
    studyViewCount: card.studyViewCount,
    lastStudiedAt: card.lastStudiedAt?.toISOString() ?? null,
    version: card.version,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}
