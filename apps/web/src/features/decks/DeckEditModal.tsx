import { useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { useDeckMutation } from "@/entities/decks/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/Modal";
import { Textarea } from "@/shared/ui/textarea";

const MAX_DESCRIPTION_LENGTH = 500;

type DeckEditModalProps = {
  deck: DeckResponse;
  onClose: () => void;
};

export function DeckEditModal({ deck, onClose }: DeckEditModalProps) {
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description ?? "");
  const [error, setError] = useState(false);
  const updateDeck = useDeckMutation();
  const trimmedTitle = title.trim();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedTitle || updateDeck.isPending) return;

    setError(false);

    try {
      await updateDeck.mutateAsync({
        id: deck.id,
        title: trimmedTitle,
        description: description.trim() || null,
      });
      onClose();
    } catch {
      setError(true);
    }
  }

  return (
    <Modal title="덱 정보 수정" onClose={onClose}>
      <form className="grid gap-3" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-bold text-inq-ink">
          덱 이름
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(false);
            }}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-inq-ink">
          <span>
            덱 설명{" "}
            <span className="font-medium text-inq-ink-soft">(선택)</span>
          </span>
          <Textarea
            className="min-h-28 resize-none font-sans text-base leading-6"
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            aria-describedby="deck-edit-description-help"
            placeholder="시험 범위나 학습 목적을 적어 주세요."
            onChange={(event) => {
              setDescription(event.target.value);
              setError(false);
            }}
          />
        </label>
        <div
          className="flex items-start justify-between gap-3 text-xs font-medium text-inq-ink-soft"
          id="deck-edit-description-help"
        >
          <span>공백으로 두면 기존 설명이 삭제됩니다.</span>
          <span className="shrink-0 tabular-nums">
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        <Button type="submit" disabled={!trimmedTitle || updateDeck.isPending}>
          {updateDeck.isPending ? "저장 중" : "변경사항 저장"}
        </Button>
        {error ? (
          <span className="text-sm font-bold text-inq-error" role="alert">
            덱 정보를 저장하지 못했습니다. 다시 시도해 주세요.
          </span>
        ) : null}
      </form>
    </Modal>
  );
}
