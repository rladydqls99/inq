import { useState } from "react";

import { apiRequest } from "../../api/client";

type DeckFormProps = {
  onCreated: () => Promise<void> | void;
};

export function DeckForm({ onCreated }: DeckFormProps) {
  const [title, setTitle] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await apiRequest("/decks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });

    setTitle("");
    await onCreated();
  }

  return (
    <form className="compact-form" onSubmit={submit}>
      <label>
        Deck name
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <button type="submit" disabled={!title.trim()}>
        Create
      </button>
    </form>
  );
}
