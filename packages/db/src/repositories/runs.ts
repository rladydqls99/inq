import type { PrismaClient } from "@prisma/client";

export async function getDeckRunState(prisma: PrismaClient, deckId: string) {
  return prisma.deckRunState.upsert({
    where: { deckId },
    create: { deckId },
    update: {},
  });
}

export async function updateDeckRunCursor(
  prisma: PrismaClient,
  deckId: string,
  input: { cursor: number; completedAt: Date | null },
) {
  return prisma.deckRunState.upsert({
    where: { deckId },
    create: {
      deckId,
      cursor: input.cursor,
      completedAt: input.completedAt,
    },
    update: {
      cursor: input.cursor,
      completedAt: input.completedAt,
    },
  });
}

export async function restartDeckRun(prisma: PrismaClient, deckId: string) {
  return prisma.deckRunState.upsert({
    where: { deckId },
    create: {
      deckId,
      cursor: 0,
      completedAt: null,
    },
    update: {
      cursor: 0,
      completedAt: null,
    },
  });
}
