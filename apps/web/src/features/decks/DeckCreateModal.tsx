import { useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { useDeckMutation } from "@/entities/decks/api";
import { Modal } from "@/shared/ui/Modal";

type DeckCreateModalProps = {
  onClose: () => void;
  onCreated: (deck: DeckResponse) => Promise<void> | void;
};

export function DeckCreateModal({ onClose, onCreated }: DeckCreateModalProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState(false);
  const createDeck = useDeckMutation();
  const trimmedTitle = title.trim();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedTitle) {
      return;
    }

    setError(false);

    try {
      const deck = await createDeck.mutateAsync({ title: trimmedTitle });
      await onCreated(deck);
      onClose();
    } catch {
      setError(true);
    }
  }

  return (
    <Modal title="덱 만들기" onClose={onClose}>
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
          disabled={!trimmedTitle}
        >
          만들기
        </button>
        {error ? (
          <span className="text-sm font-bold text-inq-error">
            덱을 생성하지 못했습니다.
          </span>
        ) : null}
      </form>
    </Modal>
  );
}
