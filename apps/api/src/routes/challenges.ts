import { Hono } from "hono";

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

    if (!body.name || !body.deckId || !body.reviewIntervalsDays) {
      return context.json({ error: "challenge_fields_required" }, 400);
    }

    const challenge = await createChallenge(options.prisma, {
      name: body.name,
      deckId: body.deckId,
      reviewIntervalsDays: body.reviewIntervalsDays,
    });

    return context.json(
      toChallengeResponse(await findChallenge(options.prisma, challenge.id)),
      201,
    );
  });

  route.patch("/:challengeId", async (context) => {
    const body = await context.req.json<{
      name?: string;
      reviewIntervalsDays?: number[];
    }>();
    const reviewIntervalsDays = body.reviewIntervalsDays;
    const data: Prisma.ChallengeUpdateInput = {};

    if (body.name !== undefined) {
      data.name = body.name;
    }

    if (reviewIntervalsDays !== undefined) {
      data.reviewIntervalsDays = reviewIntervalsDays;
      data.maxStage = reviewIntervalsDays.length;
    }

    const challenge = await options.prisma.challenge.update({
      where: { id: context.req.param("challengeId") },
      data,
    });

    return context.json(
      toChallengeResponse(await findChallenge(options.prisma, challenge.id)),
    );
  });

  route.delete("/:challengeId", async (context) => {
    await options.prisma.challenge.delete({
      where: { id: context.req.param("challengeId") },
    });

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

  route.post("/:challengeId/results", async (context) => {
    const body = await context.req.json<{
      sessionCardId?: string;
      finalResult?: "correct" | "wrong";
    }>();

    if (!body.sessionCardId || !body.finalResult) {
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

  route.post("/:challengeId/update-from-deck", async (context) => {
    return context.json(
      await updateChallengeFromDeck(
        options.prisma,
        context.req.param("challengeId"),
      ),
    );
  });

  return route;
}
