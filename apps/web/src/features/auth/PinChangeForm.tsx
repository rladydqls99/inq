import { useState } from "react";

import { apiRequest } from "../../api/client";

export function PinChangeForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [nextPinConfirm, setNextPinConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const mismatch =
    nextPin.length > 0 &&
    nextPinConfirm.length > 0 &&
    nextPin !== nextPinConfirm;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPin || !nextPin || !nextPinConfirm || mismatch) {
      return;
    }

    try {
      await apiRequest("/auth/change-pin", {
        method: "POST",
        body: JSON.stringify({ currentPin, nextPin, nextPinConfirm }),
      });
      setSaved(true);
      setError(false);
    } catch {
      setSaved(false);
      setError(true);
    }
  }

  function updateCurrentPin(value: string) {
    setCurrentPin(value);
    setSaved(false);
    setError(false);
  }

  function updateNextPin(value: string) {
    setNextPin(value);
    setSaved(false);
    setError(false);
  }

  function updateNextPinConfirm(value: string) {
    setNextPinConfirm(value);
    setSaved(false);
    setError(false);
  }

  return (
    <form className="pin-change-form" onSubmit={submit}>
      <label>
        현재 PIN
        <input
          autoComplete="current-password"
          type="password"
          value={currentPin}
          onChange={(event) => updateCurrentPin(event.target.value)}
        />
      </label>
      <label>
        새 PIN
        <input
          autoComplete="new-password"
          type="password"
          value={nextPin}
          onChange={(event) => updateNextPin(event.target.value)}
        />
      </label>
      <label>
        새 PIN 확인
        <input
          autoComplete="new-password"
          type="password"
          value={nextPinConfirm}
          onChange={(event) => updateNextPinConfirm(event.target.value)}
        />
      </label>
      {mismatch ? <p className="pin-form__error">PIN이 일치하지 않습니다.</p> : null}
      <button
        type="submit"
        disabled={!currentPin || !nextPin || !nextPinConfirm || mismatch}
      >
        PIN 변경
      </button>
      {saved ? <span>저장되었습니다.</span> : null}
      {error ? <span>PIN을 변경하지 못했습니다.</span> : null}
    </form>
  );
}
