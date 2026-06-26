import type { PrismaClient } from "@inq/db";
import {
  getDeckRunState,
  restartDeckRun,
  updateDeckRunCursor,
} from "@inq/db/repositories/runs";
import type { DeckRunResponse, QuizSegment } from "@inq/shared";

export async function getDeckRunResponse(
  prisma: PrismaClient,
  deckId: string,
): Promise<DeckRunResponse> {
  const [runState, cards] = await Promise.all([
    getDeckRunState(prisma, deckId),
    prisma.card.findMany({
      where: { deckId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    deckId,
    cursor: runState.cursor,
    completedAt: runState.completedAt?.toISOString() ?? null,
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
  const cardCount = await prisma.card.count({ where: { deckId } });
  const boundedCursor = Math.min(Math.max(cursor, 0), cardCount);
  await updateDeckRunCursor(prisma, deckId, {
    cursor: boundedCursor,
    completedAt: boundedCursor >= cardCount ? new Date() : null,
  });

  return getDeckRunResponse(prisma, deckId);
}

export async function restartDeckRunResponse(
  prisma: PrismaClient,
  deckId: string,
): Promise<DeckRunResponse> {
  await restartDeckRun(prisma, deckId);

  return getDeckRunResponse(prisma, deckId);
}
