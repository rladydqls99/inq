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
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  async function loadDecks() {
    setDecks(await apiRequest<DeckResponse[]>("/decks"));
    setLoading(false);
  }

  useEffect(() => {
    void loadDecks();
  }, []);

  function startRenaming(deck: DeckResponse) {
    setEditingDeckId(deck.id);
    setEditingTitle(deck.title);
  }

  async function saveDeckTitle(deckId: string) {
    const title = editingTitle.trim();

    if (!title) {
      return;
    }

    await apiRequest(`/decks/${deckId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
    setEditingDeckId(null);
    setEditingTitle("");
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
            {editingDeckId === deck.id ? (
              <div className="inline-edit">
                <label>
                  Deck name
                  <input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveDeckTitle(deck.id)}
                >
                  Save
                </button>
                <button type="button" onClick={() => setEditingDeckId(null)}>
                  Cancel
                </button>
              </div>
            ) : null}
            <div className="row-actions" aria-label={`${deck.title} actions`}>
              <Link className="row-action-link" to={`/decks/${deck.id}/manage`}>
                Manage cards
              </Link>
              <button type="button" onClick={() => startRenaming(deck)}>
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
