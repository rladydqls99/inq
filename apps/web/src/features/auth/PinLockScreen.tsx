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
    <main className="grid min-h-dvh place-items-center bg-inq-canvas p-6 text-inq-ink">
      <form className="grid w-full max-w-sm gap-3.5" onSubmit={submit}>
        <h1 className="mb-1 text-2xl font-bold">잠금 해제</h1>
        <label className="grid gap-1.5 text-[13px] font-bold text-inq-ink-soft">
          PIN
          <input
            className="min-h-11 rounded-lg border border-inq-line bg-inq-canvas px-3 text-inq-ink outline-offset-2 focus-visible:outline-3 focus-visible:outline-inq-highlight-strong"
            autoComplete="current-password"
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        {error ? (
          <p className="m-0 text-[13px] font-bold text-inq-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="min-h-11 cursor-pointer rounded-lg border-0 bg-inq-ink font-extrabold text-inq-canvas disabled:cursor-not-allowed disabled:bg-inq-line disabled:text-inq-ink-soft"
          type="submit"
          disabled={submitting || pin.length === 0}
        >
          열기
        </button>
      </form>
    </main>
  );
}
