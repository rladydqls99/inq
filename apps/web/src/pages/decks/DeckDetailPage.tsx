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
    <section className="grid gap-4">
      <header className="grid gap-2">
        <p className="m-0 text-sm font-bold text-inq-ink-soft">덱 카드</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <h1 className="m-0 text-[1.75rem] font-extrabold leading-[1.25] tracking-[-0.025em] text-balance">
              {deck?.title ?? "덱 카드"}
            </h1>
            <p className="m-0 text-sm font-medium text-inq-ink-soft">
              {loading ? "카드를 불러오는 중" : `카드 ${cards.length}장`}
            </p>
          </div>
          {deckId ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-inq-line bg-inq-canvas px-4 py-3 text-sm font-bold text-inq-error disabled:cursor-not-allowed disabled:text-inq-ink-soft"
                type="button"
                disabled={loading || cards.length === 0 || bulkDeleting}
                onClick={() => void deleteAllCards()}
              >
                <Trash2 aria-hidden="true" size={18} strokeWidth={2.2} />
                {bulkDeleting ? "삭제 중" : "전체 삭제"}
              </button>
              <button
                className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas disabled:cursor-not-allowed disabled:bg-inq-line disabled:text-inq-ink-soft"
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
      {loading ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          불러오는 중입니다.
        </div>
      ) : null}
      {loadError ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          카드 목록을 불러오지 못했습니다.
        </div>
      ) : null}
      {deleteError ? (
        <div className="mt-[18px] text-sm font-bold text-inq-error">
          카드를 삭제하지 못했습니다.
        </div>
      ) : null}
      {startError ? (
        <div className="mt-[18px] text-sm font-bold text-inq-error">
          학습을 시작하지 못했습니다.
        </div>
      ) : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          등록된 카드가 없습니다.
        </div>
      ) : null}
      <div className="grid gap-2">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-inq-line bg-inq-canvas p-4"
          >
            <label className="grid size-11 cursor-pointer place-items-start [&_input:checked+span]:border-inq-highlight [&_input:checked+span]:bg-inq-highlight">
              <input
                className="sr-only"
                type="checkbox"
                checked={selectedCardIds.includes(card.id)}
                onChange={() => toggleCardSelection(card.id)}
                aria-label="카드 선택"
              />
              <span
                className="grid size-5 place-items-center rounded border border-inq-line text-inq-on-highlight"
                aria-hidden="true"
              >
                {selectedCardIds.includes(card.id) ? (
                  <Check size={16} strokeWidth={3} />
                ) : null}
              </span>
            </label>
            <DeckQuizText
              className="min-w-0 text-base leading-[1.6]"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
            <div className="flex gap-1">
              <Link
                className="grid size-11 place-items-center rounded-lg text-inq-ink no-underline hover:bg-inq-surface focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2"
                to={`/cards/${card.id}/edit`}
                aria-label="카드 수정"
                title="카드 수정"
              >
                <PencilLine aria-hidden="true" size={17} strokeWidth={2.1} />
              </Link>
              <button
                className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-inq-error hover:bg-inq-surface focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2"
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
          className="fixed right-4 bottom-[calc(var(--bottom-tab-height)+env(safe-area-inset-bottom,0px)+16px)] z-10 grid size-14 cursor-pointer place-items-center rounded-full border-0 bg-inq-error text-inq-canvas shadow-[0_2px_8px_rgb(13_22_15_/_12%)] disabled:cursor-not-allowed disabled:bg-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
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
