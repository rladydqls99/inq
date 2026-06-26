import type { PrismaClient } from "@inq/db";
import type { ChallengeProgress, ChallengeResponse } from "@inq/shared";

type ChallengeWithRelations = Awaited<ReturnType<typeof findChallenge>>;

export async function findChallenge(prisma: PrismaClient, challengeId: string) {
  return prisma.challenge.findUniqueOrThrow({
    where: { id: challengeId },
    include: {
      deck: true,
      cardStates: true,
    },
  });
}

export async function listChallengeResponses(
  prisma: PrismaClient,
  now = new Date(),
): Promise<ChallengeResponse[]> {
  const challenges = await prisma.challenge.findMany({
    include: {
      deck: true,
      cardStates: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return challenges
    .map((challenge) => toChallengeResponse(challenge, now))
    .sort(compareChallengesByDueDate);
}

export function toChallengeResponse(
  challenge: NonNullable<ChallengeWithRelations>,
  now = new Date(),
): ChallengeResponse {
  const progress = calculateProgress(challenge.cardStates, now);

  return {
    id: challenge.id,
    name: challenge.name,
    deckId: challenge.deckId,
    deckTitle: challenge.deck.title,
    status: challenge.status as ChallengeResponse["status"],
    answerMode: challenge.answerMode as ChallengeResponse["answerMode"],
    reviewIntervalsDays: challenge.reviewIntervalsDays as number[],
    maxStage: challenge.maxStage,
    dueCount: progress.dueCards,
    progress,
    nextDueAt: findNextDueAt(challenge.cardStates, now),
    createdAt: challenge.createdAt.toISOString(),
    updatedAt: challenge.updatedAt.toISOString(),
  };
}

function calculateProgress(
  states: Array<{
    stage: number;
    dueAt: Date | null;
    completedAt: Date | null;
  }>,
  now: Date,
): ChallengeProgress {
  const currentStageCounts: Record<number, number> = {};
  let completedCards = 0;
  let dueCards = 0;

  for (const state of states) {
    if (state.completedAt) {
      completedCards += 1;
      continue;
    }

    currentStageCounts[state.stage] = (currentStageCounts[state.stage] ?? 0) + 1;

    if (isDue(state.dueAt, now)) {
      dueCards += 1;
    }
  }

  return {
    totalCards: states.length,
    completedCards,
    dueCards,
    currentStageCounts,
  };
}

function findNextDueAt(
  states: Array<{ dueAt: Date | null; completedAt: Date | null }>,
  now: Date,
): string | null {
  const dueTimes = states
    .filter((state) => !state.completedAt && state.dueAt)
    .map((state) => state.dueAt?.getTime())
    .filter((time): time is number => typeof time === "number")
    .sort((left, right) => left - right);

  if (dueTimes.length === 0) {
    return states.some((state) => !state.completedAt && isDue(state.dueAt, now))
      ? null
      : null;
  }

  return new Date(dueTimes[0] ?? 0).toISOString();
}

function isDue(dueAt: Date | null, now: Date) {
  return dueAt === null || dueAt.getTime() <= now.getTime();
}

function compareChallengesByDueDate(
  left: ChallengeResponse,
  right: ChallengeResponse,
) {
  const leftDueNow = left.dueCount > 0;
  const rightDueNow = right.dueCount > 0;

  if (leftDueNow !== rightDueNow) {
    return leftDueNow ? -1 : 1;
  }

  const leftTime = left.nextDueAt
    ? Date.parse(left.nextDueAt)
    : Number.POSITIVE_INFINITY;
  const rightTime = right.nextDueAt
    ? Date.parse(right.nextDueAt)
    : Number.POSITIVE_INFINITY;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.createdAt.localeCompare(right.createdAt);
}
