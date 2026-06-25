import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { ActionListItem } from "../../components/ActionListItem";
import { PageHeader } from "../../components/PageHeader";
import { DeckForm } from "./DeckForm";

export function DeckListPage() {
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDecks() {
    setDecks(await apiRequest<DeckResponse[]>("/decks"));
    setLoading(false);
  }

  useEffect(() => {
    void loadDecks();
  }, []);

  async function renameDeck(deck: DeckResponse) {
    const title = window.prompt("Deck name", deck.title)?.trim();

    if (!title || title === deck.title) {
      return;
    }

    await apiRequest(`/decks/${deck.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    await loadDecks();
  }

  async function deleteDeck(deckId: string) {
    await apiRequest(`/decks/${deckId}`, { method: "DELETE" });
    await loadDecks();
  }

  return (
    <section className="page">
      <PageHeader title="Decks" />
      <DeckForm onCreated={loadDecks} />
      {loading ? <div className="list-empty">Loading</div> : null}
      {!loading && decks.length === 0 ? <div className="list-empty">No decks</div> : null}
      <div className="action-list">
        {decks.map((deck) => (
          <div key={deck.id} className="deck-row" data-testid={`deck-row-${deck.id}`}>
            <ActionListItem
              to={`/decks/${deck.id}/run`}
              title={deck.title}
              meta={`${deck.cardCount} cards`}
            />
            <div className="row-actions" aria-label={`${deck.title} actions`}>
              <Link className="row-action-link" to={`/decks/${deck.id}/manage`}>
                Manage cards
              </Link>
              <button type="button" onClick={() => void renameDeck(deck)}>
                Rename
              </button>
              <button type="button" onClick={() => void deleteDeck(deck.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
