import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { useDecks } from "@/entities/decks/api";
import { DeckCreateDialog } from "@/widgets/DeckCreateDialog";

type DeckSelectOrCreateProps = {
  selectedDeckId: string;
  onSelectDeck: (deckId: string) => void;
};

export function DeckSelectOrCreate({
  selectedDeckId,
  onSelectDeck,
}: DeckSelectOrCreateProps) {
  const { data: decks = [], isError: loadError } = useDecks();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!selectedDeckId && decks[0]) onSelectDeck(decks[0].id);
  }, [decks, onSelectDeck, selectedDeckId]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-48 flex-1 gap-1.5 text-sm font-bold text-inq-ink">
        <span>덱 선택</span>
        <select
          className="min-h-12 rounded-lg border border-inq-line bg-inq-canvas px-3.5 py-3 text-base outline-none focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30"
          value={selectedDeckId}
          onChange={(event) => onSelectDeck(event.target.value)}
        >
          {decks.length === 0 ? <option value="">등록된 덱 없음</option> : null}
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-inq-line bg-inq-canvas px-4 py-3 text-sm font-bold text-inq-ink"
        onClick={() => setCreateOpen(true)}
      >
        <Plus aria-hidden="true" size={18} strokeWidth={2.25} />덱 만들기
      </button>
      {loadError ? (
        <div className="w-full rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error">
          덱 목록을 불러오지 못했습니다.
        </div>
      ) : null}
      {createOpen ? (
        <DeckCreateDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(deck) => {
            onSelectDeck(deck.id);
          }}
        />
      ) : null}
    </div>
  );
}
