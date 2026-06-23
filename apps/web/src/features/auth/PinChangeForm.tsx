import { useState } from "react";

import { apiRequest } from "../../api/client";

export function PinChangeForm() {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [nextPinConfirm, setNextPinConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <button type="submit">Change PIN</button>
      {saved ? <span>Saved</span> : null}
    </form>
  );
}
