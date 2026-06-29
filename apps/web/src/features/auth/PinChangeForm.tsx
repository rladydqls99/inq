import { useState } from "react";

import { apiRequest } from "../../api/client";

export function PinChangeForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [nextPinConfirm, setNextPinConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  const mismatch =
    nextPin.length > 0 &&
    nextPinConfirm.length > 0 &&
    nextPin !== nextPinConfirm;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPin || !nextPin || !nextPinConfirm || mismatch) {
      return;
    }

    await apiRequest("/auth/change-pin", {
      method: "POST",
      body: JSON.stringify({ currentPin, nextPin, nextPinConfirm }),
    });
    setSaved(true);
  }

  return (
    <form className="pin-change-form" onSubmit={submit}>
      <label>
        Current PIN
        <input
          autoComplete="current-password"
          type="password"
          value={currentPin}
          onChange={(event) => setCurrentPin(event.target.value)}
        />
      </label>
      <label>
        New PIN
        <input
          autoComplete="new-password"
          type="password"
          value={nextPin}
          onChange={(event) => setNextPin(event.target.value)}
        />
      </label>
      <label>
        Confirm New PIN
        <input
          autoComplete="new-password"
          type="password"
          value={nextPinConfirm}
          onChange={(event) => setNextPinConfirm(event.target.value)}
        />
      </label>
      {mismatch ? <p className="pin-form__error">PIN이 일치하지 않습니다.</p> : null}
      <button
        type="submit"
        disabled={!currentPin || !nextPin || !nextPinConfirm || mismatch}
      >
        Change PIN
      </button>
      {saved ? <span>Saved</span> : null}
    </form>
  );
}
