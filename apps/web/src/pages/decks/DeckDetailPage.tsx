import { useEffect, useRef, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  useDeckCards,
  useDecks,
  useDeleteCard,
  useStartDeckRun,
} from "@/entities/decks/api";
import { CardListHeader } from "@/shared/ui/CardListHeader";
import { QuizTextRenderer } from "@/shared/ui/QuizTextRenderer";
import {
  primeDeckVehicleControlFromUserGesture,
  releasePrimedDeckVehicleControl,
} from "./MediaSessionController";

export function DeckDetailPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState(false);
  const [startError, setStartError] = useState(false);
  const {
    data: cards = [],
    isPending: loading,
    isError: loadError,
  } = useDeckCards(deckId);
  const { data: decks = [] } = useDecks();
  const deck = decks.find((item) => item.id === deckId);
  const deleteCardMutation = useDeleteCard(deckId);
  const startRunMutation = useStartDeckRun(deckId);
  const mountedRef = useRef(true);
  const handOffPrimedAudioRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (!handOffPrimedAudioRef.current) {
        releasePrimedDeckVehicleControl();
      }
    };
  }, []);

  async function deleteCard(cardId: string) {
    setDeleteError(false);

    try {
      await deleteCardMutation.mutateAsync(cardId);
    } catch {
      setDeleteError(true);
    }
  }

  async function startDeckRun() {
    if (!deckId || startRunMutation.isPending || cards.length === 0) {
      return;
    }

    primeDeckVehicleControlFromUserGesture();
    handOffPrimedAudioRef.current = false;
    setStartError(false);

    try {
      await startRunMutation.mutateAsync();

      if (!mountedRef.current) {
        releasePrimedDeckVehicleControl();
        return;
      }

      handOffPrimedAudioRef.current = true;
      navigate(`/decks/${deckId}/run`);
    } catch {
      releasePrimedDeckVehicleControl();

      if (mountedRef.current) {
        setStartError(true);
      }
    }
  }

  return (
    <section className="page card-list-page">
      <CardListHeader
        context="덱 카드"
        title={deck?.title ?? "덱 카드"}
        meta={loading ? "카드를 불러오는 중" : `카드 ${cards.length}장`}
        action={
          deckId ? (
            <button
              className="card-list-header__start"
              type="button"
              disabled={
                loading || cards.length === 0 || startRunMutation.isPending
              }
              onClick={() => void startDeckRun()}
            >
              {startRunMutation.isPending ? "준비 중" : "학습 시작"}
            </button>
          ) : null
        }
      />
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? (
        <div className="list-empty">카드 목록을 불러오지 못했습니다.</div>
      ) : null}
      {deleteError ? (
        <div className="list-empty">카드를 삭제하지 못했습니다.</div>
      ) : null}
      {startError ? (
        <div className="list-empty">학습을 시작하지 못했습니다.</div>
      ) : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="list-empty">등록된 카드가 없습니다.</div>
      ) : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <QuizTextRenderer
              className="card-editor__revealed"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
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
