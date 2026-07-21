import type { Prisma, PrismaClient } from "../client";

export async function createChallenge(
  prisma: PrismaClient,
  input: { name: string; deckId: string; reviewIntervalsDays: number[] },
) {
  const maxStage = input.reviewIntervalsDays.length;

  return prisma.$transaction(async (transaction) => {
    const deck = await transaction.deck.findUniqueOrThrow({
      where: { id: input.deckId },
      select: {
        id: true,
        title: true,
        cards: {
          orderBy: { createdAt: "asc" },
          select: { id: true, segments: true },
        },
      },
    });
    const cards = deck.cards;
    const emptyDeck = cards.length === 0;
    const challenge = await transaction.challenge.create({
      data: {
        name: input.name,
        sourceDeckId: deck.id,
        sourceDeckTitle: deck.title,
        reviewIntervalsDays:
          input.reviewIntervalsDays as unknown as Prisma.InputJsonValue,
        maxStage,
        status: emptyDeck ? "completed" : "active",
        completedAt: emptyDeck ? new Date() : null,
      },
    });

    for (const card of cards) {
      await transaction.challengeCard.create({
        data: {
          challengeId: challenge.id,
          sourceDeckCardId: card.id,
          segments: card.segments as Prisma.InputJsonValue,
          state: { create: { challengeId: challenge.id } },
        },
      });
    }

    return challenge;
  });
}

export async function updateChallengeFromDeck(
  prisma: PrismaClient,
  challengeId: string,
) {
  return prisma.$transaction(async (transaction) => {
    const challenge = await transaction.challenge.findUniqueOrThrow({
      where: { id: challengeId },
      select: { id: true, sourceDeckId: true },
    });

    if (!challenge.sourceDeckId) {
      throw new ChallengeSourceDeckUnavailableError(challengeId);
    }

    const cards = await transaction.card.findMany({
      where: { deckId: challenge.sourceDeckId },
      orderBy: { createdAt: "asc" },
      select: { id: true, segments: true },
    });
    const existingChallengeCards = await transaction.challengeCard.findMany({
      where: { challengeId },
      select: { sourceDeckCardId: true },
    });
    const existingSourceCardIds = new Set(
      existingChallengeCards.flatMap((card) =>
        card.sourceDeckCardId ? [card.sourceDeckCardId] : [],
      ),
    );
    const missingCards = cards.filter(
      (card) => !existingSourceCardIds.has(card.id),
    );

    for (const card of missingCards) {
      await transaction.challengeCard.create({
        data: {
          challengeId: challenge.id,
          sourceDeckCardId: card.id,
          segments: card.segments as Prisma.InputJsonValue,
          state: { create: { challengeId: challenge.id } },
        },
      });
    }

    if (missingCards.length > 0) {
      await transaction.challenge.update({
        where: { id: challenge.id },
        data: {
          status: "active",
          completedAt: null,
        },
      });
    }

    return { addedCount: missingCards.length };
  });
}

export class ChallengeSourceDeckUnavailableError extends Error {
  constructor(challengeId: string) {
    super(`Source deck is unavailable for challenge: ${challengeId}`);
    this.name = "ChallengeSourceDeckUnavailableError";
  }
}
