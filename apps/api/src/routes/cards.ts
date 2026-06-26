import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import {
  deleteCard,
  getCardById,
  listCardsByDeck,
  updateCard,
} from "@inq/db/repositories/cards";
import { hasAnswerSegment, type CardResponse, type QuizSegment } from "@inq/shared";

export function createCardRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/decks/:deckId/cards", async (context) => {
    const cards = await listCardsByDeck(options.prisma, context.req.param("deckId"));

    return context.json(cards.map(toCardResponse));
  });

  route.get("/cards/:cardId", async (context) => {
    const card = await getCardById(options.prisma, context.req.param("cardId"));

    return context.json(toCardResponse(card));
  });

  route.patch("/cards/:cardId", async (context) => {
    const body = await context.req.json<{
      segments?: QuizSegment[];
      version?: number;
    }>();

    if (!body.segments || typeof body.version !== "number") {
      return context.json({ error: "card_update_fields_required" }, 400);
    }

    if (!isValidQuizSegments(body.segments)) {
      return context.json({ error: "invalid_card_segments" }, 400);
    }

    const card = await updateCard(options.prisma, context.req.param("cardId"), {
      segments: body.segments,
      version: body.version,
    });

    return context.json(toCardResponse(card));
  });

  route.delete("/cards/:cardId", async (context) => {
    await deleteCard(options.prisma, context.req.param("cardId"));

    return context.body(null, 204);
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

function isValidQuizSegments(segments: unknown): segments is QuizSegment[] {
  return (
    Array.isArray(segments) &&
    segments.length > 0 &&
    segments.every(isValidQuizSegment) &&
    hasAnswerSegment(segments)
  );
}

function isValidQuizSegment(segment: unknown): segment is QuizSegment {
  if (!segment || typeof segment !== "object") {
    return false;
  }

  const candidate = segment as Partial<QuizSegment>;

  if (candidate.type === "text") {
    return typeof candidate.value === "string";
  }

  return (
    candidate.type === "answer" &&
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.value === "string" &&
    candidate.value.length > 0
  );
}
