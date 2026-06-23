import type { PrismaClient } from "@inq/db";
import { createCard } from "@inq/db/repositories/cards";
import { parseMarkdownImport } from "@inq/shared";

export function previewMarkdownImport(markdown: string) {
  return parseMarkdownImport(markdown);
}

export async function confirmMarkdownImport(
  prisma: PrismaClient,
  input: { deckId: string; markdown: string },
) {
  const preview = parseMarkdownImport(input.markdown);

  if (preview.errors.length > 0) {
    return { ok: false as const, preview };
  }

  for (const card of preview.previewCards) {
    await createCard(prisma, {
      deckId: input.deckId,
      segments: card.segments,
    });
  }

  return {
    ok: true as const,
    createdCount: preview.previewCards.length,
  };
}
