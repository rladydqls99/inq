import { useEffect, useRef, useState } from "react";
import { Check, PencilLine, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  useDeckCards,
  useDecks,
  useDeleteCard,
  useStartDeckRun,
} from "@/entities/decks/api";
import { DeckQuizText } from "@/features/decks/DeckQuizText";
import {
  primeVehicleControlFromUserGesture,
  releasePrimedVehicleControl,
} from "@/widgets/vehicleControl";

export function DeckDetailPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
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
        releasePrimedVehicleControl();
      }
    };
  }, []);

  useEffect(() => {
    setSelectedCardIds((selected) => {
      const next = selected.filter((id) =>
        cards.some((card) => card.id === id),
      );
      return next.length === selected.length ? selected : next;
    });
  }, [cards]);

  async function deleteCard(cardId: string) {
    setDeleteError(false);

    try {
      await deleteCardMutation.mutateAsync(cardId);
      setSelectedCardIds((selected) => selected.filter((id) => id !== cardId));
    } catch {
      setDeleteError(true);
    }
  }

  function toggleCardSelection(cardId: string) {
    setSelectedCardIds((selected) =>
      selected.includes(cardId)
        ? selected.filter((id) => id !== cardId)
        : [...selected, cardId],
    );
  }

  async function deleteSelectedCards() {
    if (selectedCardIds.length === 0 || bulkDeleting) return;

    setBulkDeleting(true);
    setDeleteError(false);
    const results = await Promise.allSettled(
      selectedCardIds.map((id) => deleteCardMutation.mutateAsync(id)),
    );
    const failedIds = selectedCardIds.filter(
      (_, index) => results[index]?.status === "rejected",
    );
    setSelectedCardIds(failedIds);
    setBulkDeleting(false);

    if (failedIds.length > 0) setDeleteError(true);
  }

  async function deleteAllCards() {
    if (cards.length === 0 || bulkDeleting) return;

    setBulkDeleting(true);
    setDeleteError(false);
    const results = await Promise.allSettled(
      cards.map((card) => deleteCardMutation.mutateAsync(card.id)),
    );
    const failedIds = cards
      .filter((_, index) => results[index]?.status === "rejected")
      .map((card) => card.id);
    setSelectedCardIds(failedIds);
    setBulkDeleting(false);

    if (failedIds.length > 0) setDeleteError(true);
  }

  async function startDeckRun() {
    if (!deckId || startRunMutation.isPending || cards.length === 0) {
      return;
    }

    primeVehicleControlFromUserGesture();
    handOffPrimedAudioRef.current = false;
    setStartError(false);

    try {
      await startRunMutation.mutateAsync();

      if (!mountedRef.current) {
        releasePrimedVehicleControl();
        return;
      }

      handOffPrimedAudioRef.current = true;
      navigate(`/decks/${deckId}/run`);
    } catch {
      releasePrimedVehicleControl();

      if (mountedRef.current) {
        setStartError(true);
      }
    }
  }

  return (
    <section className="page card-list-page">
      <header className="card-list-header">
        <p className="card-list-header__context">덱 카드</p>
        <div className="card-list-header__main">
          <div className="card-list-header__copy">
            <h1>{deck?.title ?? "덱 카드"}</h1>
            <p>{loading ? "카드를 불러오는 중" : `카드 ${cards.length}장`}</p>
          </div>
          {deckId ? (
            <div className="card-list-header__actions">
              <button
                className="card-list-header__delete-selected"
                type="button"
                disabled={loading || cards.length === 0 || bulkDeleting}
                onClick={() => void deleteAllCards()}
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={2.2} />
                {bulkDeleting ? "삭제 중" : "전체 삭제"}
              </button>
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
            </div>
          ) : null}
        </div>
      </header>
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
          <article
            key={card.id}
            className="card-editor card-editor--selectable"
          >
            <label className="card-editor__select">
              <input
                type="checkbox"
                checked={selectedCardIds.includes(card.id)}
                onChange={() => toggleCardSelection(card.id)}
                aria-label="카드 선택"
              />
              <span className="card-editor__checkbox" aria-hidden="true">
                {selectedCardIds.includes(card.id) ? (
                  <Check size={16} strokeWidth={3} />
                ) : null}
              </span>
            </label>
            <DeckQuizText
              className="card-editor__revealed"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
            <div className="card-editor__actions">
              <Link
                className="row-action-link"
                to={`/cards/${card.id}/edit`}
                aria-label="카드 수정"
                title="카드 수정"
              >
                <PencilLine aria-hidden="true" size={17} strokeWidth={2.1} />
              </Link>
              <button
                type="button"
                aria-label="카드 삭제"
                title="카드 삭제"
                onClick={() => void deleteCard(card.id)}
              >
                <Trash2 aria-hidden="true" size={17} strokeWidth={2.1} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {selectedCardIds.length > 0 ? (
        <button
          className="floating-delete-button"
          type="button"
          disabled={bulkDeleting}
          aria-label={
            bulkDeleting
              ? "선택한 카드 삭제 중"
              : `선택한 카드 ${selectedCardIds.length}장 삭제`
          }
          onClick={() => void deleteSelectedCards()}
        >
          <Trash2 aria-hidden="true" size={22} strokeWidth={2.4} />
        </button>
      ) : null}
    </section>
  );
}
