import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getRevealedText, type CardResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";

export function DeckDetailPage() {
  const { deckId } = useParams();
  const [cards, setCards] = useState<CardResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    if (!deckId) {
      return;
    }

    let mounted = true;

    apiRequest<CardResponse[]>(`/decks/${deckId}/cards`)
      .then((response) => {
        if (mounted) {
          setCards(response);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [deckId]);

  async function deleteCard(cardId: string) {
    setDeleteError(false);

    try {
      await apiRequest(`/cards/${cardId}`, { method: "DELETE" });
      setCards((currentCards) => currentCards.filter((card) => card.id !== cardId));
    } catch {
      setDeleteError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="Deck Cards" />
      {loading ? <div className="list-empty">Loading</div> : null}
      {deleteError ? <div className="list-empty">카드를 삭제하지 못했습니다.</div> : null}
      {!loading && cards.length === 0 ? <div className="list-empty">No cards</div> : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <p className="card-editor__revealed">{getRevealedText(card.segments)}</p>
            <div className="card-editor__actions">
              <Link className="row-action-link" to={`/cards/${card.id}/edit`}>
                Edit card
              </Link>
              <button type="button" onClick={() => void deleteCard(card.id)}>
                Delete card
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
