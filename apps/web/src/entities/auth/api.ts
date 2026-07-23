import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/shared/api/client";

export type AuthStatus = { pinConfigured: boolean; unlocked: boolean };

export const authQueryKey = ["auth", "status"] as const;

export const useAuthStatus = () =>
  useQuery({
    queryKey: authQueryKey,
    queryFn: () => apiRequest<AuthStatus>("/auth/status"),
  });

export function useUnlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pin: string) =>
      apiRequest("/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () =>
      queryClient.setQueryData<AuthStatus>(authQueryKey, {
        pinConfigured: true,
        unlocked: true,
      }),
  });
}

export function useLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest("/auth/lock", { method: "POST" }),
    onSuccess: () =>
      queryClient.setQueryData<AuthStatus>(authQueryKey, (status) =>
        status ? { ...status, unlocked: false } : status,
      ),
  });
}
