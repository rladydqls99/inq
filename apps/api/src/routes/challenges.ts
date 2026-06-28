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
    const body = await context.req.json();
    const name = trimmedString(readField(body, "name"));
    const deckId = trimmedString(readField(body, "deckId"));
    const reviewIntervalsDays = readField(body, "reviewIntervalsDays");

    if (!name || !deckId || !reviewIntervalsDays) {
      return context.json({ error: "challenge_fields_required" }, 400);
    }

    if (!isValidReviewIntervals(reviewIntervalsDays)) {
      return context.json({ error: "invalid_review_intervals" }, 400);
    }

    const deck = await options.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true },
    });

    if (!deck) {
      return context.json({ error: "deck_not_found" }, 404);
    }

    const challenge = await createChallenge(options.prisma, {
      name,
      deckId,
      reviewIntervalsDays,
    });

    return context.json(
      toChallengeResponse(await findChallenge(options.prisma, challenge.id)),
      201,
    );
  });

  route.patch("/:challengeId", async (context) => {
    const challengeId = context.req.param("challengeId");
    const body = await context.req.json();
    const reviewIntervalsDays = readField(body, "reviewIntervalsDays");
    const data: Prisma.ChallengeUpdateInput = {};

    if (!isRecord(body)) {
      return context.json({ error: "challenge_fields_required" }, 400);
    }

    if (readField(body, "name") !== undefined) {
      const name = trimmedString(readField(body, "name"));

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
    const challengeId = context.req.param("challengeId");
    const challenge = await options.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });

    if (!challenge) {
      return context.json({ error: "challenge_not_found" }, 404);
    }

    return context.json(
      await getOrCreateChallengeRunState(
        options.prisma,
        challengeId,
      ),
    );
  });

  route.patch("/:challengeId/run", async (context) => {
    const challengeId = context.req.param("challengeId");
    const body = await context.req.json<{ cursor?: number }>();
    const cursor = body.cursor;

    if (typeof cursor !== "number" || !Number.isInteger(cursor)) {
      return context.json({ error: "cursor_required" }, 400);
    }

    const challenge = await options.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });

    if (!challenge) {
      return context.json({ error: "challenge_not_found" }, 404);
    }

    const activeSession = await options.prisma.challengeRunSession.findFirst({
      where: {
        challengeId,
        status: "active",
      },
      select: { id: true },
    });

    if (!activeSession) {
      return context.json({ error: "active_challenge_run_not_found" }, 404);
    }

    return context.json(
      await updateChallengeRunCursor(options.prisma, {
        challengeId,
        cursor,
      }),
    );
  });

  route.post("/:challengeId/results", async (context) => {
    const challengeId = context.req.param("challengeId");
    const body = await context.req.json();
    const sessionCardId = trimmedString(readField(body, "sessionCardId"));
    const finalResult = readField(body, "finalResult");

    if (!sessionCardId || !isChallengeResult(finalResult)) {
      return context.json({ error: "challenge_result_fields_required" }, 400);
    }

    const challenge = await options.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    });

    if (!challenge) {
      return context.json({ error: "challenge_not_found" }, 404);
    }

    const activeSession = await options.prisma.challengeRunSession.findFirst({
      where: {
        challengeId,
        status: "active",
      },
      select: { queue: true },
    });

    if (!activeSession) {
      return context.json({ error: "active_challenge_run_not_found" }, 404);
    }

    const queueCard = findQueueCard(activeSession.queue, sessionCardId);

    if (!queueCard) {
      return context.json({ error: "session_card_not_found" }, 404);
    }

    const cardState = await options.prisma.challengeCardState.findUnique({
      where: { id: queueCard.stateId },
      select: { id: true },
    });

    if (!cardState) {
      return context.json({ error: "session_card_not_found" }, 404);
    }

    return context.json(
      await submitChallengeRunResult(options.prisma, {
        challengeId,
        sessionCardId,
        finalResult,
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

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readField(value: unknown, field: string): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return value[field];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isChallengeResult(result: unknown): result is "correct" | "wrong" {
  return result === "correct" || result === "wrong";
}

function findQueueCard(queue: unknown, sessionCardId: string) {
  if (!Array.isArray(queue)) {
    return null;
  }

  for (const card of queue) {
    if (
      card &&
      typeof card === "object" &&
      "sessionCardId" in card &&
      "stateId" in card &&
      card.sessionCardId === sessionCardId &&
      typeof card.stateId === "string"
    ) {
      return card;
    }
  }

  return null;
}
