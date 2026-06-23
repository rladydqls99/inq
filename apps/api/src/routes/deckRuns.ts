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
    return context.json(
      await getDeckRunResponse(options.prisma, context.req.param("deckId")),
    );
  });

  route.patch("/:deckId/run", async (context) => {
    const body = await context.req.json<{ cursor?: number }>();

    if (typeof body.cursor !== "number") {
      return context.json({ error: "cursor_required" }, 400);
    }

    return context.json(
      await updateDeckRun(options.prisma, context.req.param("deckId"), body.cursor),
    );
  });

  route.post("/:deckId/run/restart", async (context) => {
    return context.json(
      await restartDeckRunResponse(options.prisma, context.req.param("deckId")),
    );
  });

  return route;
}
