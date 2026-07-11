import { useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { Modal } from "../../components/Modal";

type DeckCreateModalProps = {
  onClose: () => void;
  onCreated: (deck: DeckResponse) => Promise<void> | void;
};

export function DeckCreateModal({ onClose, onCreated }: DeckCreateModalProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState(false);
  const trimmedTitle = title.trim();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedTitle) {
      return;
    }

    setError(false);

    try {
      const deck = await apiRequest<DeckResponse>("/decks", {
        method: "POST",
        body: JSON.stringify({ title: trimmedTitle }),
      });
      await onCreated(deck);
      onClose();
    } catch {
      setError(true);
    }
  }

  return (
    <Modal title="덱 만들기" onClose={onClose}>
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
        <button type="submit" disabled={!trimmedTitle}>
          만들기
        </button>
        {error ? <span className="form-error">덱을 생성하지 못했습니다.</span> : null}
      </form>
    </Modal>
  );
}
