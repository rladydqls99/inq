import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import type { DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { DeckCreateModal } from "../decks/DeckCreateModal";

type DeckSelectOrCreateProps = {
  selectedDeckId: string;
  onSelectDeck: (deckId: string) => void;
};

export function DeckSelectOrCreate({
  selectedDeckId,
  onSelectDeck,
}: DeckSelectOrCreateProps) {
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiRequest<DeckResponse[]>("/decks")
      .then((response) => {
        if (!mounted) {
          return;
        }

        setDecks(response);
        setLoadError(false);
        if (!selectedDeckId && response[0]) {
          onSelectDeck(response[0].id);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [onSelectDeck]);

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
      <button type="button" className="secondary-button" onClick={() => setCreateOpen(true)}>
        <Plus aria-hidden="true" size={18} strokeWidth={2.25} />
        덱 만들기
      </button>
      {loadError ? <div className="import-summary is-error">덱 목록을 불러오지 못했습니다.</div> : null}
      {createOpen ? (
        <DeckCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(deck) => {
            setDecks((current) => [...current, deck]);
            onSelectDeck(deck.id);
          }}
        />
      ) : null}
    </div>
  );
}
