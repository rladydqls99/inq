import type { PrismaClient } from "@inq/db";
import {
  getDeckRunState,
  updateDeckRunCursor,
} from "@inq/db/repositories/runs";
import type { DeckRunResponse, QuizSegment } from "@inq/shared";

export async function getDeckRunResponse(
  prisma: PrismaClient,
  deckId: string,
): Promise<DeckRunResponse> {
  const [runState, cards, deck] = await Promise.all([
    getDeckRunState(prisma, deckId),
    prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.deck.findUniqueOrThrow({
      where: { id: deckId },
      select: { title: true },
    }),
  ]);
  const cursor = Math.min(runState.cursor, cards.length);
  const completedAt =
    cursor >= cards.length
      ? runState.completedAt ?? new Date()
      : null;

  if (
    cursor !== runState.cursor ||
    (runState.completedAt?.getTime() ?? null) !==
      (completedAt?.getTime() ?? null)
  ) {
    await updateDeckRunCursor(prisma, deckId, {
      cursor,
      completedAt,
    });
  }

  return {
    deckId,
    deckTitle: deck.title,
    cursor,
    completedAt: completedAt?.toISOString() ?? null,
    cards: cards.map((card) => ({
      cardId: card.id,
      segments: card.segments as QuizSegment[],
    })),
  };
}

export async function updateDeckRun(
  prisma: PrismaClient,
  deckId: string,
  cursor: number,
): Promise<DeckRunResponse> {
  const [runState, cards] = await Promise.all([
    getDeckRunState(prisma, deckId),
    prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);
  const cardCount = cards.length;
  const boundedCursor = Math.min(Math.max(cursor, 0), cardCount);
  const now = new Date();
  const passedCardIds = cards
    .slice(Math.max(runState.cursor, 0), boundedCursor)
    .map((card) => card.id);

  await prisma.$transaction(async (transaction) => {
    if (passedCardIds.length > 0) {
      await transaction.card.updateMany({
        where: { id: { in: passedCardIds } },
        data: {
          studyViewCount: { increment: 1 },
          lastStudiedAt: now,
        },
      });
    }

    await transaction.deckRunState.upsert({
      where: { deckId },
      create: {
        deckId,
        cursor: boundedCursor,
        completedAt: boundedCursor >= cardCount ? now : null,
      },
      update: {
        cursor: boundedCursor,
        completedAt: boundedCursor >= cardCount ? now : null,
      },
    });
  });

  return getDeckRunResponse(prisma, deckId);
}
