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
    <form className="grid gap-3" onSubmit={submit}>
      <label className="grid gap-1.5 text-sm font-bold text-inq-ink">
        덱 이름
        <input
          className="min-h-12 rounded-lg border border-inq-line bg-inq-canvas px-3.5 py-3 text-base text-inq-ink outline-none focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setError(false);
          }}
        />
      </label>
      <button
        className="min-h-12 cursor-pointer rounded-lg border-0 bg-inq-ink px-[18px] py-3 text-sm font-bold text-inq-canvas disabled:cursor-not-allowed disabled:bg-inq-line disabled:text-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98]"
        type="submit"
        disabled={!title.trim()}
      >
        만들기
      </button>
      {error ? (
        <span className="text-sm font-bold text-inq-error">
          덱을 생성하지 못했습니다.
        </span>
      ) : null}
    </form>
  );
}
