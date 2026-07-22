import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import { restartDeckRun } from "@inq/db/repositories/runs";
import {
  getDeckRunResponse,
  updateDeckRun,
} from "../services/deckRunService";

export function createDeckRunRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/:deckId/run", async (context) => {
    const deckId = context.req.param("deckId");
    const deck = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    return context.json(
      await getDeckRunResponse(options.prisma, deckId),
    );
  });

  route.patch("/:deckId/run", async (context) => {
    const deckId = context.req.param("deckId");
    const body = await context.req.json();
    const cursor = readField(body, "cursor");

    if (typeof cursor !== "number" || !Number.isInteger(cursor)) {
      return context.json({ error: "cursor_required" }, 400);
    }

    const deck = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    return context.json(
      await updateDeckRun(options.prisma, deckId, cursor),
    );
  });

  route.post("/:deckId/run/restart", async (context) => {
    const deckId = context.req.param("deckId");
    const deck = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    await restartDeckRun(options.prisma, deckId);
    return context.json(await getDeckRunResponse(options.prisma, deckId));
  });

  return route;
}

function readField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[field];
}
