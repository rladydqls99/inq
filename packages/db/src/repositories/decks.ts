import type { PrismaClient } from "../client";

export async function createDeck(
  prisma: PrismaClient,
  input: { title: string; description?: string | null },
) {
  return prisma.deck.create({
    data: { title: input.title, description: input.description ?? null },
  });
}

export async function getDeck(prisma: PrismaClient, deckId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      _count: {
        select: { cards: true },
      },
    },
  });

  if (!deck) return null;

  const { _count, ...result } = deck;
  return { ...result, cardCount: _count.cards };
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

export async function updateDeck(
  prisma: PrismaClient,
  deckId: string,
  input: { title?: string; description?: string | null },
) {
  return prisma.deck.update({
    where: { id: deckId },
    data: input,
  });
}

export async function deleteDeck(prisma: PrismaClient, deckId: string) {
  return prisma.deck.delete({
    where: { id: deckId },
  });
}
