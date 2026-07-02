import type { PrismaClient } from "../client";

export async function createDeck(
  prisma: PrismaClient,
  input: { title: string },
) {
  return prisma.deck.create({
    data: { title: input.title },
  });
}

export async function listDecks(prisma: PrismaClient) {
  const decks = await prisma.deck.findMany({
    include: {
      _count: {
        select: { cards: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return decks.map(({ _count, ...deck }) => ({
    ...deck,
    cardCount: _count.cards,
  }));
}

export async function renameDeck(
  prisma: PrismaClient,
  deckId: string,
  input: { title: string },
) {
  return prisma.deck.update({
    where: { id: deckId },
    data: { title: input.title },
  });
}

export async function deleteDeck(prisma: PrismaClient, deckId: string) {
  return prisma.deck.delete({
    where: { id: deckId },
  });
}
