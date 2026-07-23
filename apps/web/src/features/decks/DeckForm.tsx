import { useState } from "react";

import { useDeckMutation } from "@/entities/decks/api";

type DeckFormProps = {
  onCreated: () => Promise<void> | void;
};

export function DeckForm({ onCreated }: DeckFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState(false);
  const createDeck = useDeckMutation();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(false);

    try {
      await createDeck.mutateAsync({ title });

      setTitle("");
      await onCreated();
    } catch {
      setError(true);
    }
  }

  return (
    <form className="compact-form" onSubmit={submit}>
      <label>
        덱 이름
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(false);
          }}
        />
      </label>
      <button type="submit" disabled={!title.trim()}>
        만들기
      </button>
      {error ? <span>덱을 생성하지 못했습니다.</span> : null}
    </form>
  );
}
