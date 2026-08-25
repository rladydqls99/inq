import type { Prisma, PrismaClient } from "../client";
import type { QuizSegment } from "@inq/shared";

export async function createCard(
  prisma: PrismaClient,
  input: { deckId: string; category?: string; segments: QuizSegment[] },
) {
  return prisma.card.create({
    data: {
      deckId: input.deckId,
      category: input.category ?? null,
      segments: input.segments as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listCardsByDeck(prisma: PrismaClient, deckId: string) {
  return prisma.card.findMany({
    where: { deckId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCardById(prisma: PrismaClient, cardId: string) {
  return prisma.card.findUniqueOrThrow({
    where: { id: cardId },
  });
}

export async function updateCard(
  prisma: PrismaClient,
  cardId: string,
  input: { category?: string; segments: QuizSegment[]; version: number },
) {
  return prisma.card.update({
    where: {
      id: cardId,
      version: input.version,
    },
    data: {
      segments: input.segments as unknown as Prisma.InputJsonValue,
      category: input.category ?? null,
      version: { increment: 1 },
    },
  });
}

export async function deleteCard(prisma: PrismaClient, cardId: string) {
  await prisma.card.delete({
    where: { id: cardId },
  });
}
