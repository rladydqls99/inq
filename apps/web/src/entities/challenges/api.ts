import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChallengeCardResponse,
  ChallengeResponse,
  ChallengeRunState,
} from "@inq/shared";
import { apiRequest } from "@/shared/api/client";

export const challengeKeys = {
  all: ["challenges"] as const,
  cards: (id: string) => ["challenges", id, "cards"] as const,
  run: (id: string) => ["challenges", id, "run"] as const,
};
export const useChallenges = () =>
  useQuery({
    queryKey: challengeKeys.all,
    queryFn: () => apiRequest<ChallengeResponse[]>("/challenges"),
  });
export const useChallengeCards = (id?: string) =>
  useQuery({
    queryKey: challengeKeys.cards(id ?? ""),
    queryFn: () =>
      apiRequest<ChallengeCardResponse[]>(`/challenges/${id}/cards`),
    enabled: Boolean(id),
  });
export const useChallengeRun = (id?: string) =>
  useQuery({
    queryKey: challengeKeys.run(id ?? ""),
    queryFn: () => apiRequest<ChallengeRunState>(`/challenges/${id}/run`),
    enabled: Boolean(id),
  });
export function useChallengeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id?: string;
      name: string;
      deckId?: string;
      reviewIntervalsDays?: number[];
    }) =>
      apiRequest<ChallengeResponse>(id ? `/challenges/${id}` : "/challenges", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: challengeKeys.all }),
  });
}
export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/challenges/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: challengeKeys.all }),
  });
}
export function useUpdateChallengeFromDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ addedCount: number }>(`/challenges/${id}/update-from-deck`, {
        method: "POST",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: challengeKeys.all }),
  });
}
export const useMoveChallengeRun = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cursor: number) =>
      apiRequest<ChallengeRunState>(`/challenges/${id}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor }),
      }),
    onSuccess: (run) =>
      queryClient.setQueryData(challengeKeys.run(id ?? ""), run),
  });
};
export const useSubmitChallengeResult = (id?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionCardId,
      finalResult,
    }: {
      sessionCardId: string;
      finalResult: "correct" | "wrong";
    }) =>
      apiRequest<{ runState: ChallengeRunState }>(`/challenges/${id}/results`, {
        method: "POST",
        body: JSON.stringify({ sessionCardId, finalResult }),
      }),
    onSuccess: ({ runState }) =>
      queryClient.setQueryData(challengeKeys.run(id ?? ""), runState),
  });
};
