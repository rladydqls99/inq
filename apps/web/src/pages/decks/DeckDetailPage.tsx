import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  useDeck,
  useDeckCards,
  useDeleteCard,
  useStartDeckRun,
} from "@/entities/decks/api";
import { DeckEditModal } from "@/features/decks/DeckEditModal";
import { DeckQuizText } from "@/features/decks/DeckQuizText";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { QuizCategoryBadge } from "@/shared/ui/quiz-category-badge";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import {
  primeVehicleControlFromUserGesture,
  releasePrimedVehicleControl,
} from "@/widgets/vehicleControl";
import { primeDeckPromptSpeechFromUserGesture } from "@/widgets/useDeckPromptSpeech";

export function DeckDetailPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deleteError, setDeleteError] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const {
    data: deck,
    isPending: deckLoading,
    isError: deckLoadError,
  } = useDeck(deckId);
  const {
    data: cards = [],
    isPending: loading,
    isError: loadError,
  } = useDeckCards(deckId);
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
    primeDeckPromptSpeechFromUserGesture();
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
    <section className="grid gap-6">
      <header className="grid gap-4 border-b border-inq-line pb-5">
        <div className="grid min-w-0 gap-1.5">
          <h1 className="m-0 text-2xl font-extrabold leading-[1.25] tracking-[-0.025em] text-balance">
            {deck?.title ?? "덱 카드"}
          </h1>
          <p className="m-0 text-sm font-medium text-inq-ink-soft">
            {loading ? "카드를 불러오고 있어요" : `카드 ${cards.length}장`}
          </p>
        </div>
        {deckId ? (
          <div className="grid gap-3">
            <Button
              className="w-full"
              type="button"
              disabled={
                loading || cards.length === 0 || startRunMutation.isPending
              }
              onClick={() => void startDeckRun()}
            >
              {startRunMutation.isPending ? "준비 중" : "학습 시작"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Link
                className={buttonVariants({
                  className: "w-full no-underline",
                  size: "default",
                  variant: "secondary",
                })}
                to={`/upload?deckId=${encodeURIComponent(deckId)}`}
              >
                카드 업로드
              </Link>
              <Button
                className="w-full"
                variant="danger"
                type="button"
                disabled={loading || cards.length === 0 || bulkDeleting}
                onClick={() => void deleteAllCards()}
              >
                {bulkDeleting ? "삭제 중" : "전체 삭제"}
              </Button>
            </div>
          </div>
        ) : null}
        {deck ? (
          <details className="border-t border-inq-line pt-1">
            <summary className="min-h-12 cursor-pointer py-3 text-sm font-bold text-inq-ink marker:text-inq-ink-soft focus-visible:rounded-md focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2">
              덱 설명
            </summary>
            <div className="grid justify-items-start gap-3 pb-2 pl-5">
              <p className="m-0 max-w-[65ch] whitespace-pre-wrap break-words text-sm font-medium leading-[1.65] text-inq-ink-soft text-pretty">
                {deck.description ??
                  "아직 설명이 없습니다. 시험 범위나 학습 목적을 기록해 보세요."}
              </p>
              <Button
                size="compact"
                variant="secondary"
                type="button"
                onClick={() => setEditModalOpen(true)}
              >
                {deck.description ? "설명 수정" : "설명 추가"}
              </Button>
            </div>
          </details>
        ) : null}
      </header>
      {deckLoadError ? (
        <div className="text-sm font-bold text-inq-error" role="alert">
          덱 정보를 불러오지 못했습니다.
        </div>
      ) : null}
      {deckLoading ? (
        <div className="text-sm font-bold text-inq-ink-soft">
          덱 정보를 불러오는 중입니다.
        </div>
      ) : null}
      {loading ? (
        <div className="mt-4 text-sm font-bold text-inq-ink-soft">
          불러오는 중입니다.
        </div>
      ) : null}
      {loadError ? (
        <div className="mt-4 text-sm font-bold text-inq-ink-soft">
          카드 목록을 불러오지 못했습니다.
        </div>
      ) : null}
      {deleteError ? (
        <div className="mt-4 text-sm font-bold text-inq-error">
          카드를 삭제하지 못했습니다.
        </div>
      ) : null}
      {startError ? (
        <div className="mt-4 text-sm font-bold text-inq-error">
          학습을 시작하지 못했습니다.
        </div>
      ) : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="mt-4 text-sm font-bold text-inq-ink-soft">
          등록된 카드가 없습니다.
        </div>
      ) : null}
      <div className="grid gap-2">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-2 border-b border-inq-line py-4"
          >
            <label className="grid size-11 cursor-pointer place-items-start pt-0.5">
              <Checkbox
                checked={selectedCardIds.includes(card.id)}
                onCheckedChange={() => toggleCardSelection(card.id)}
                aria-label="카드 선택"
              />
            </label>
            <div className="grid min-w-0 gap-1.5">
              <QuizCategoryBadge category={card.category} />
              <DeckQuizText
                className="min-w-0 text-base leading-[1.55]"
                mode="revealed"
                segments={card.segments}
                tone="study"
              />
            </div>
            <ActionMenu
              label="카드 메뉴"
              open={openMenuCardId === card.id}
              onToggle={() =>
                setOpenMenuCardId((current) =>
                  current === card.id ? null : card.id,
                )
              }
            >
              <Link
                className="grid min-h-11 items-center px-3 text-sm font-bold text-inq-ink no-underline hover:bg-inq-surface focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-[-3px]"
                to={`/cards/${card.id}/edit`}
              >
                수정
              </Link>
              <button
                className="!text-inq-error"
                type="button"
                onClick={() => {
                  setOpenMenuCardId(null);
                  void deleteCard(card.id);
                }}
              >
                삭제
              </button>
            </ActionMenu>
          </article>
        ))}
      </div>
      {selectedCardIds.length > 0 ? (
        <Button
          className="fixed right-4 bottom-[calc(var(--bottom-tab-height)+env(safe-area-inset-bottom,0px)+16px)] z-10 !size-12 !rounded-full bg-inq-error text-inq-canvas shadow-[0_4px_8px_rgb(180_35_24_/_28%)] hover:bg-inq-error"
          size="floating"
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
        </Button>
      ) : null}
      {editModalOpen && deck ? (
        <DeckEditModal deck={deck} onClose={() => setEditModalOpen(false)} />
      ) : null}
    </section>
  );
}
