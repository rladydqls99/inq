import { Hono, type Context } from "hono";

import type { Prisma, PrismaClient } from "@inq/db";
import {
  createChallenge,
  updateChallengeFromDeck,
} from "@inq/db/repositories/challenges";
import {
  findChallenge,
  listChallengeResponses,
  toChallengeResponse,
} from "../services/challengeService";
import {
  getOrCreateChallengeRunState,
  submitChallengeRunResult,
  updateChallengeRunCursor,
} from "../services/challengeRunService";

export function createChallengeRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/", async (context) => {
    return context.json(await listChallengeResponses(options.prisma));
  });

  route.post("/", async (context) => {
    const body = await context.req.json<{
      name?: string;
      deckId?: string;
      reviewIntervalsDays?: number[];
    }>();
    const name = body.name?.trim();

    if (!name || !body.deckId || !body.reviewIntervalsDays) {
      return context.json({ error: "challenge_fields_required" }, 400);
    }

    if (!isValidReviewIntervals(body.reviewIntervalsDays)) {
      return context.json({ error: "invalid_review_intervals" }, 400);
    }

    const deck = await options.prisma.deck.findUnique({
      where: { id: body.deckId },
      select: { id: true },
    });

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    const challenge = await createChallenge(options.prisma, {
      name,
      deckId: body.deckId,
      reviewIntervalsDays: body.reviewIntervalsDays,
    });

    return context.json(
      toChallengeResponse(await findChallenge(options.prisma, challenge.id)),
      201,
    );
  });

  route.patch("/:challengeId", async (context) => {
    const challengeId = context.req.param("challengeId");
    const body = await context.req.json<{
      name?: string;
      reviewIntervalsDays?: number[];
    }>();
    const reviewIntervalsDays = body.reviewIntervalsDays;
    const data: Prisma.ChallengeUpdateInput = {};

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        return context.json({ error: "challenge_name_required" }, 400);
      }

      data.name = name;
    }

    if (reviewIntervalsDays !== undefined) {
      if (!isValidReviewIntervals(reviewIntervalsDays)) {
        return context.json({ error: "invalid_review_intervals" }, 400);
      }

      data.reviewIntervalsDays = reviewIntervalsDays;
      data.maxStage = reviewIntervalsDays.length;
    }

    const exists = await options.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });

    if (!exists) {
      return context.json({ error: "challenge_not_found" }, 404);
    }

    const challenge = await options.prisma.challenge.update({
      where: { id: challengeId },
      data,
    });

    return context.json(
      toChallengeResponse(await findChallenge(options.prisma, challenge.id)),
    );
  });

  route.delete("/:challengeId", async (context) => {
    const result = await options.prisma.challenge.deleteMany({
      where: { id: context.req.param("challengeId") },
    });

    if (result.count === 0) {
      return context.json({ error: "challenge_not_found" }, 404);
    }

    return context.body(null, 204);
  });

  route.get("/:challengeId/run", async (context) => {
    return context.json(
      await getOrCreateChallengeRunState(
        options.prisma,
        context.req.param("challengeId"),
      ),
    );
  });

  route.patch("/:challengeId/run", async (context) => {
    const body = await context.req.json<{ cursor?: number }>();

    if (typeof body.cursor !== "number") {
      return context.json({ error: "cursor_required" }, 400);
    }

    return context.json(
      await updateChallengeRunCursor(options.prisma, {
        challengeId: context.req.param("challengeId"),
        cursor: body.cursor,
      }),
    );
  });

  route.post("/:challengeId/results", async (context) => {
    const body = await context.req.json<{
      sessionCardId?: string;
      finalResult?: "correct" | "wrong";
    }>();

    if (!body.sessionCardId || !isChallengeResult(body.finalResult)) {
      return context.json({ error: "challenge_result_fields_required" }, 400);
    }

    return context.json(
      await submitChallengeRunResult(options.prisma, {
        challengeId: context.req.param("challengeId"),
        sessionCardId: body.sessionCardId,
        finalResult: body.finalResult,
      }),
    );
  });

  async function updateChallengeFromDeckHandler(context: Context) {
    const challengeId = context.req.param("challengeId");

    if (!challengeId) {
      return context.json({ error: "challenge_id_required" }, 400);
    }

    const exists = await options.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });

    if (!exists) {
      return context.json({ error: "challenge_not_found" }, 404);
    }

    return context.json(
      await updateChallengeFromDeck(options.prisma, challengeId),
    );
  }

  route.post("/:challengeId/update", updateChallengeFromDeckHandler);
  route.post("/:challengeId/update-from-deck", updateChallengeFromDeckHandler);

  return route;
}

function isValidReviewIntervals(intervals: unknown): intervals is number[] {
  return (
    Array.isArray(intervals) &&
    intervals.length > 0 &&
    intervals.every((interval) => Number.isInteger(interval) && interval > 0)
  );
}

function isChallengeResult(result: unknown): result is "correct" | "wrong" {
  return result === "correct" || result === "wrong";
}
