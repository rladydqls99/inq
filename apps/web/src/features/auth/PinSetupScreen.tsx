import { useState } from "react";

type PinSetupScreenProps = {
  error?: string | null;
  onSubmit: (pin: string) => Promise<void>;
};

export function PinSetupScreen({ error, onSubmit }: PinSetupScreenProps) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && pin !== confirm;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mismatch) {
      return;
    }

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
        <h1>PIN 설정</h1>
        <label>
          PIN
          <input
            autoComplete="new-password"
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
        </label>
        <label>
          PIN 확인
          <input
            autoComplete="new-password"
            inputMode="numeric"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </label>
        {mismatch ? <p className="pin-form__error">PIN이 일치하지 않습니다.</p> : null}
        {error ? <p className="pin-form__error">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || pin.length === 0 || confirm.length === 0 || mismatch}
        >
          설정하기
        </button>
      </form>
    </main>
  );
}
