import { useEffect, useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";

type DeckSelectOrCreateProps = {
  selectedDeckId: string;
  onSelectDeck: (deckId: string) => void;
};

export function DeckSelectOrCreate({
  selectedDeckId,
  onSelectDeck,
}: DeckSelectOrCreateProps) {
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [createError, setCreateError] = useState(false);

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

  async function createDeck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreateError(false);

    try {
      const deck = await apiRequest<DeckResponse>("/decks", {
        method: "POST",
        body: JSON.stringify({ title: newDeckTitle }),
      });

      setDecks((current) => [...current, deck]);
      onSelectDeck(deck.id);
      setNewDeckTitle("");
    } catch {
      setCreateError(true);
    }
  }

  return (
    <div className="deck-select-create">
      <label>
        Deck
        <select
          value={selectedDeckId}
          onChange={(event) => onSelectDeck(event.target.value)}
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.title}
            </option>
          ))}
        </select>
      </label>
      <form className="deck-create-form" onSubmit={createDeck}>
        <label>
          New deck name
          <input
            value={newDeckTitle}
            onChange={(event) => {
              setNewDeckTitle(event.target.value);
              setCreateError(false);
            }}
          />
        </label>
        <button type="submit" disabled={!newDeckTitle.trim()}>
          Create deck
        </button>
        {createError ? <span>덱을 생성하지 못했습니다.</span> : null}
      </form>
      {loadError ? <div className="import-summary is-error">덱 목록을 불러오지 못했습니다.</div> : null}
    </div>
  );
}
