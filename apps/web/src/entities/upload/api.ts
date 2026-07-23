import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ImportPreviewResponse } from "@inq/shared";

import { deckKeys } from "@/entities/decks/api";
import { apiRequest } from "@/shared/api/client";

export const useMarkdownPreview = () =>
  useMutation({
    mutationFn: (markdown: string) =>
      apiRequest<ImportPreviewResponse>("/import/markdown/preview", {
        method: "POST",
        body: JSON.stringify({ markdown }),
      }),
  });

export function useConfirmMarkdownImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, markdown }: { deckId: string; markdown: string }) =>
      apiRequest<{ createdCount: number }>("/import/markdown/confirm", {
        method: "POST",
        body: JSON.stringify({ deckId, markdown }),
      }),
    onSuccess: (_result, { deckId }) =>
      queryClient.invalidateQueries({ queryKey: deckKeys.cards(deckId) }),
  });
}
