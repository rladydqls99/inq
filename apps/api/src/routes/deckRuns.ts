import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import {
  getDeckRunResponse,
  restartDeckRunResponse,
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
    const body = await context.req.json<{ cursor?: number }>();

    if (typeof body.cursor !== "number") {
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
      await updateDeckRun(options.prisma, deckId, body.cursor),
    );
  });

  route.post("/:deckId/run/restart", async (context) => {
    return context.json(
      await restartDeckRunResponse(options.prisma, context.req.param("deckId")),
    );
  });

  return route;
}
