import { useEffect, useState, type ReactNode } from "react";

import { apiRequest } from "../api/client";
import { PinLockScreen } from "../features/auth/PinLockScreen";
import { PinSetupScreen } from "../features/auth/PinSetupScreen";

type AuthStatus = {
  pinConfigured: boolean;
  unlocked: boolean;
};

type PinGateProps = {
  children: ReactNode;
};

export function PinGate({ children }: PinGateProps) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    apiRequest<AuthStatus>("/auth/status")
      .then((nextStatus) => {
        if (mounted) {
          setStatus(nextStatus);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus({ pinConfigured: true, unlocked: false });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleLocked() {
      setStatus((current) =>
        current ? { pinConfigured: current.pinConfigured, unlocked: false } : current,
      );
    }

    window.addEventListener("inq:locked", handleLocked);

    return () => window.removeEventListener("inq:locked", handleLocked);
  }, []);

  async function setupPin(pin: string) {
    setError(null);

    try {
      await apiRequest("/auth/setup-pin", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      await unlock(pin);
    } catch {
      setError("PIN을 설정하지 못했습니다.");
    }
  }

  async function unlock(pin: string) {
    setError(null);

    try {
      await apiRequest("/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      setStatus({ pinConfigured: true, unlocked: true });
    } catch {
      setError("PIN을 확인해 주세요.");
    }
  }

  if (!status) {
    return <div className="pin-gate pin-gate--loading" />;
  }

  if (!status.pinConfigured) {
    return <PinSetupScreen error={error} onSubmit={setupPin} />;
  }

  if (!status.unlocked) {
    return <PinLockScreen error={error} onSubmit={unlock} />;
  }

  return <>{children}</>;
}
