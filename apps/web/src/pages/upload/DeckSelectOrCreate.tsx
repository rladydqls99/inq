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
    <div className="deck-select-create">
      <label className="deck-select-create__field">
        <span>덱 선택</span>
        <select
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
        className="secondary-button"
        onClick={() => setCreateOpen(true)}
      >
        <Plus aria-hidden="true" size={18} strokeWidth={2.25} />덱 만들기
      </button>
      {loadError ? (
        <div className="import-summary is-error">
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
