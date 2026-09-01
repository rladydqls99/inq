import type { Prisma, PrismaClient } from "../client";

type PersistedChallengeRunQueueCard = {
  sessionCardId: string;
  stateId: string;
  challengeCardId: string;
  queueIndex: number;
  startingStage: number;
  selectedResult: "correct" | "wrong" | null;
};

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
          select: { id: true, category: true, segments: true },
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
          category: card.category,
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
      select: { id: true, category: true, segments: true },
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

    const addedQueueCards: PersistedChallengeRunQueueCard[] = [];

    for (const card of missingCards) {
      const challengeCard = await transaction.challengeCard.create({
        data: {
          challengeId: challenge.id,
          sourceDeckCardId: card.id,
          category: card.category,
          segments: card.segments as Prisma.InputJsonValue,
          state: { create: { challengeId: challenge.id } },
        },
        include: { state: true },
      });

      if (!challengeCard.state) {
        throw new Error(
          `Challenge card state was not created: ${challengeCard.id}`,
        );
      }

      addedQueueCards.push({
        sessionCardId: challengeCard.state.id,
        stateId: challengeCard.state.id,
        challengeCardId: challengeCard.id,
        queueIndex: 0,
        startingStage: challengeCard.state.stage,
        selectedResult: null,
      });
    }

    if (missingCards.length > 0) {
      const activeSession = await transaction.challengeRunSession.findFirst({
        where: { challengeId: challenge.id, status: "active" },
        orderBy: { createdAt: "desc" },
      });

      if (activeSession) {
        const currentQueue = activeSession.queue as unknown as
          PersistedChallengeRunQueueCard[] | undefined;
        const queue = Array.isArray(currentQueue) ? currentQueue : [];
        const preservedCount = Math.min(activeSession.cursor + 1, queue.length);
        const preservedQueue = queue.slice(0, preservedCount);
        const remainingQueue = shuffle([
          ...queue.slice(preservedCount),
          ...addedQueueCards,
        ]);
        const nextQueue = [...preservedQueue, ...remainingQueue].map(
          (queueCard, queueIndex) => ({ ...queueCard, queueIndex }),
        );

        await transaction.challengeRunSession.update({
          where: { id: activeSession.id },
          data: { queue: nextQueue as unknown as Prisma.InputJsonValue },
        });
      }

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

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex] as T,
      shuffled[index] as T,
    ];
  }

  return shuffled;
}
