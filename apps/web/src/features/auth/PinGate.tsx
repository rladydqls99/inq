import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  authQueryKey,
  useAuthStatus,
  useUnlock,
  type AuthStatus,
} from "@/entities/auth/api";
import { PinLockScreen } from "@/features/auth/PinLockScreen";

type PinGateProps = {
  children: ReactNode;
};

export function PinGate({ children }: PinGateProps) {
  const { data: status } = useAuthStatus();
  const queryClient = useQueryClient();
  const unlockMutation = useUnlock();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLocked = () =>
      queryClient.setQueryData<AuthStatus>(authQueryKey, (current) =>
        current ? { ...current, unlocked: false } : current,
      );
    window.addEventListener("inq:locked", handleLocked);
    return () => window.removeEventListener("inq:locked", handleLocked);
  }, [queryClient]);

  async function unlock(pin: string) {
    setError(null);

    try {
      await unlockMutation.mutateAsync(pin);
    } catch {
      setError("PIN을 확인해 주세요.");
    }
  }

  if (!status) {
    return <div className="pin-gate pin-gate--loading" />;
  }

  if (!status.unlocked) {
    return <PinLockScreen error={error} onSubmit={unlock} />;
  }

  return <>{children}</>;
}
