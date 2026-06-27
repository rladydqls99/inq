import type { Prisma, PrismaClient } from "@prisma/client";

export async function createChallenge(
  prisma: PrismaClient,
  input: { name: string; deckId: string; reviewIntervalsDays: number[] },
) {
  const maxStage = input.reviewIntervalsDays.length;

  return prisma.$transaction(async (transaction) => {
    const cards = await transaction.card.findMany({
      where: { deckId: input.deckId },
      select: { id: true },
    });
    const emptyDeck = cards.length === 0;
    const challenge = await transaction.challenge.create({
      data: {
        name: input.name,
        deckId: input.deckId,
        reviewIntervalsDays:
          input.reviewIntervalsDays as unknown as Prisma.InputJsonValue,
        maxStage,
        status: emptyDeck ? "completed" : "active",
        completedAt: emptyDeck ? new Date() : null,
      },
    });

    if (cards.length > 0) {
      await transaction.challengeCardState.createMany({
        data: cards.map((card) => ({
          challengeId: challenge.id,
          cardId: card.id,
        })),
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
      select: { id: true, deckId: true },
    });
    const cards = await transaction.card.findMany({
      where: { deckId: challenge.deckId },
      select: { id: true },
    });
    const existingStates = await transaction.challengeCardState.findMany({
      where: { challengeId },
      select: { cardId: true },
    });
    const existingCardIds = new Set(
      existingStates.map((state) => state.cardId),
    );
    const missingCards = cards.filter((card) => !existingCardIds.has(card.id));

    if (missingCards.length > 0) {
      await transaction.challengeCardState.createMany({
        data: missingCards.map((card) => ({
          challengeId: challenge.id,
          cardId: card.id,
        })),
      });
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
