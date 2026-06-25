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

  useEffect(() => {
    let mounted = true;

    apiRequest<DeckResponse[]>("/decks").then((response) => {
      if (!mounted) {
        return;
      }

      setDecks(response);
      if (!selectedDeckId && response[0]) {
        onSelectDeck(response[0].id);
      }
    });

    return () => {
      mounted = false;
    };
  }, [onSelectDeck]);

  async function createDeck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const deck = await apiRequest<DeckResponse>("/decks", {
      method: "POST",
      body: JSON.stringify({ title: newDeckTitle }),
    });

    setDecks((current) => [...current, deck]);
    onSelectDeck(deck.id);
    setNewDeckTitle("");
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
            onChange={(event) => setNewDeckTitle(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!newDeckTitle.trim()}>
          Create deck
        </button>
      </form>
    </div>
  );
}
