import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

type PinLockScreenProps = {
  error?: string | null;
  onSubmit: (pin: string) => Promise<void>;
};

export function PinLockScreen({ error, onSubmit }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit(pin);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-inq-canvas p-6 text-inq-ink">
      <form className="grid w-full max-w-sm gap-3.5" onSubmit={submit}>
        <h1 className="mb-1 text-2xl font-bold">잠금 해제</h1>
        <label className="grid gap-1.5 text-sm font-bold text-inq-ink-soft">
          PIN
          <Input
            className="min-h-11 px-3"
            autoComplete="current-password"
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        {error ? (
          <p className="m-0 text-sm font-bold text-inq-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          className="min-h-11"
          type="submit"
          disabled={submitting || pin.length === 0}
        >
          열기
        </Button>
      </form>
    </main>
  );
}
