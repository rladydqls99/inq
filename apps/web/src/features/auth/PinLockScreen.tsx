import { useState } from "react";

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
    <main className="pin-screen">
      <form className="pin-form" onSubmit={submit}>
        <h1>Unlock</h1>
        <label>
          PIN
          <input
            autoComplete="current-password"
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        {error ? <p className="pin-form__error">{error}</p> : null}
        <button type="submit" disabled={submitting || pin.length === 0}>
          Unlock
        </button>
      </form>
    </main>
  );
}
