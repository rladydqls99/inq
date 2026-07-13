import { useEffect, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { getRevealedText, type CardResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";

export function DeckDetailPage() {
  const { deckId } = useParams();
  const [cards, setCards] = useState<CardResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
          setLoadError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
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
      <PageHeader title="덱 카드" />
      {deckId ? (
        <Link className="primary-link-button" to={`/decks/${deckId}/run`}>
          학습 시작
        </Link>
      ) : null}
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? <div className="list-empty">카드 목록을 불러오지 못했습니다.</div> : null}
      {deleteError ? <div className="list-empty">카드를 삭제하지 못했습니다.</div> : null}
      {!loading && !loadError && cards.length === 0 ? <div className="list-empty">등록된 카드가 없습니다.</div> : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <p className="card-editor__revealed">{getRevealedText(card.segments)}</p>
            <div className="card-editor__actions">
              <Link className="row-action-link" to={`/cards/${card.id}/edit`}>
                <PencilLine aria-hidden="true" size={17} strokeWidth={2.1} />
                카드 수정
              </Link>
              <button type="button" onClick={() => void deleteCard(card.id)}>
                <Trash2 aria-hidden="true" size={17} strokeWidth={2.1} />
                카드 삭제
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
