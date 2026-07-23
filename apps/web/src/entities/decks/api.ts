import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CardResponse,
  DeckResponse,
  DeckRunResponse,
  QuizSegment,
} from "@inq/shared";
import { apiRequest } from "@/shared/api/client";

export const deckKeys = {
  all: ["decks"] as const,
  detail: (id: string) => ["decks", id] as const,
  cards: (id: string) => ["decks", id, "cards"] as const,
  card: (id: string) => ["cards", id] as const,
  run: (id: string) => ["decks", id, "run"] as const,
};
export const useDecks = () =>
  useQuery({
    queryKey: deckKeys.all,
    queryFn: () => apiRequest<DeckResponse[]>("/decks"),
  });
export const useDeckCards = (id?: string) =>
  useQuery({
    queryKey: deckKeys.cards(id ?? ""),
    queryFn: () => apiRequest<CardResponse[]>(`/decks/${id}/cards`),
    enabled: Boolean(id),
  });
export const useCard = (id?: string) =>
  useQuery({
    queryKey: deckKeys.card(id ?? ""),
    queryFn: () => apiRequest<CardResponse>(`/cards/${id}`),
    enabled: Boolean(id),
  });
export const useDeckRun = (id?: string) =>
  useQuery({
    queryKey: deckKeys.run(id ?? ""),
    queryFn: () => apiRequest<DeckRunResponse>(`/decks/${id}/run`),
    enabled: Boolean(id),
  });

export function useDeckMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string; title: string }) =>
      apiRequest<DeckResponse>(id ? `/decks/${id}` : "/decks", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (deck) => {
      queryClient.setQueryData<DeckResponse[]>(deckKeys.all, (decks) =>
        decks?.some((item) => item.id === deck.id)
          ? decks.map((item) => (item.id === deck.id ? deck : item))
          : [...(decks ?? []), deck],
      );
      queryClient.invalidateQueries({
        queryKey: deckKeys.all,
        refetchType: "none",
      });
    },
  });
}
export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/decks/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deckKeys.all }),
  });
}
export function useCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      segments,
      version,
    }: {
      id: string;
      segments: QuizSegment[];
      version: number;
    }) =>
      apiRequest<CardResponse>(`/cards/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ segments, version }),
      }),
    onSuccess: (card) => {
      queryClient.setQueryData(deckKeys.card(card.id), card);
      queryClient.invalidateQueries({ queryKey: deckKeys.cards(card.deckId) });
    },
  });
}
export function useDeleteCard(deckId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/cards/${id}`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      if (!deckId) return;
      queryClient.setQueryData<CardResponse[]>(
        deckKeys.cards(deckId),
        (cards) => cards?.filter((card) => card.id !== id),
      );
      queryClient.invalidateQueries({
        queryKey: deckKeys.cards(deckId),
        refetchType: "none",
      });
    },
  });
}
export const useMoveDeckRun = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cursor: number) =>
      apiRequest<DeckRunResponse>(`/decks/${id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor }),
      }),
    onSuccess: (run) => queryClient.setQueryData(deckKeys.run(id ?? ""), run),
  });
};
export const useStartDeckRun = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const run = await apiRequest<DeckRunResponse>(`/decks/${id}/run`);
      return run.completedAt || run.cursor >= run.cards.length
        ? apiRequest<DeckRunResponse>(`/decks/${id}/run/restart`, {
            method: "POST",
          })
        : run;
    },
    onSuccess: (run) => queryClient.setQueryData(deckKeys.run(id ?? ""), run),
  });
};
