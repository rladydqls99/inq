import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";

import type { QuizSegment } from "@inq/shared";
import { Button } from "@/shared/ui/Button";
import { DeckQuizText } from "./DeckQuizText";

type DeckCardPlayerProps = {
  segments: QuizSegment[];
  currentIndex: number;
  totalCards: number;
  answerRevealed: boolean;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onMoveTo: (index: number) => void;
  onAnswerReveal: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function DeckCardPlayer({
  segments,
  currentIndex,
  totalCards,
  answerRevealed,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onMoveTo,
  onAnswerReveal,
  onDelete,
  deleting,
}: DeckCardPlayerProps) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const progressPreview = useRef<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const displayIndex = Math.min(Math.max(currentIndex + 1, 1), totalCards);
  const progressIndex = previewIndex ?? displayIndex;
  const progress = totalCards === 0 ? 0 : (progressIndex / totalCards) * 100;

  useEffect(() => setPreviewIndex(null), [currentIndex]);

  function progressIndexAt(clientX: number, target: HTMLElement) {
    const { left, width } = target.getBoundingClientRect();
    return Math.min(
      Math.max(
        Math.round(((clientX - left) / width) * (totalCards - 1)) + 1,
        1,
      ),
      totalCards,
    );
  }

  function handleProgressPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (totalCards < 2) return;
    if ("setPointerCapture" in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const index = progressIndexAt(event.clientX, event.currentTarget);
    progressPreview.current = index;
    setPreviewIndex(index);
  }

  function handleProgressPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (progressPreview.current === null) return;
    const index = progressIndexAt(event.clientX, event.currentTarget);
    progressPreview.current = index;
    setPreviewIndex(index);
  }

  function commitProgressMove() {
    const index = progressPreview.current;
    progressPreview.current = null;
    setPreviewIndex(null);
    if (index !== null && index !== displayIndex) onMoveTo(index - 1);
  }

  function handleProgressKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowDown: -1,
      ArrowRight: 1,
      ArrowUp: 1,
      PageDown: -1,
      PageUp: 1,
    };
    const index =
      event.key === "Home"
        ? 1
        : event.key === "End"
          ? totalCards
          : displayIndex + (offsets[event.key] ?? 0);
    if (!(event.key in offsets) && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    const boundedIndex = Math.min(Math.max(index, 1), totalCards);
    if (boundedIndex !== displayIndex) onMoveTo(boundedIndex - 1);
  }

  function revealAnswer() {
    if (!answerRevealed) onAnswerReveal();
  }

  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    if (
      answerRevealed ||
      (event.target instanceof Element && event.target.closest("button"))
    ) {
      return;
    }
    revealAnswer();
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      revealAnswer();
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    if (
      !touch ||
      touch.clientX <= 24 ||
      touch.clientX >= window.innerWidth - 24
    ) {
      swipeStart.current = null;
      return;
    }
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = swipeStart.current;
    const touch = event.changedTouches[0];
    swipeStart.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2)
      return;
    if (deltaX > 0 && canPrevious) onPrevious();
    if (deltaX < 0 && canNext) onNext();
  }

  return (
    <section
      className="flex min-w-0 flex-1 flex-col gap-6"
      aria-label={`퀴즈 카드 ${displayIndex}/${totalCards}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-4 text-sm font-bold leading-[1.4] text-inq-ink-soft [&_strong]:text-inq-ink [&_strong]:tabular-nums">
          <span>학습 진행</span>
          <div className="flex items-center gap-2">
            <strong>
              {displayIndex} / {totalCards}
            </strong>
            {onDelete ? (
              <Button
                className="text-inq-error hover:text-inq-error"
                disabled={deleting}
                size="compact"
                variant="ghost"
                onClick={onDelete}
              >
                {deleting ? "삭제 중" : "삭제"}
              </Button>
            ) : null}
          </div>
        </div>
        <div
          className="relative -my-5 h-11 cursor-pointer touch-none before:absolute before:top-5 before:right-0 before:left-0 before:h-1 before:rounded-full before:bg-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 [&>span]:absolute [&>span]:top-5 [&>span]:left-0 [&>span]:h-1 [&>span]:rounded-full [&>span]:bg-inq-highlight-strong [&>span]:transition-[width] [&>span]:duration-180 [&>span]:after:absolute [&>span]:after:top-1/2 [&>span]:after:right-[-6px] [&>span]:after:size-3 [&>span]:after:rounded-full [&>span]:after:bg-inq-highlight-strong [&>span]:after:content-[''] [&>span]:after:-translate-y-1/2 motion-reduce:[&>span]:transition-none"
          role="slider"
          aria-label="카드 학습 진행률"
          aria-valuemin={1}
          aria-valuemax={totalCards}
          aria-valuenow={progressIndex}
          aria-valuetext={`${progressIndex} / ${totalCards}`}
          tabIndex={totalCards > 1 ? 0 : undefined}
          onKeyDown={handleProgressKeyDown}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={commitProgressMove}
          onPointerCancel={commitProgressMove}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>
      <div
        className="grid min-h-[260px] flex-1 cursor-pointer grid-cols-[44px_minmax(0,1fr)_44px] items-center"
        onClick={handleStageClick}
      >
        <button
          className="inline-flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inq-ink-soft disabled:cursor-default disabled:text-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          aria-label="이전 카드"
          disabled={!canPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" size={32} strokeWidth={2.2} />
        </button>
        <div
          className="grid w-full max-w-[34rem] place-items-center self-stretch rounded-lg px-0 py-4 text-center focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-[-3px]"
          role={!answerRevealed ? "button" : undefined}
          tabIndex={!answerRevealed ? 0 : undefined}
          aria-label={
            !answerRevealed ? "카드 영역을 눌러 정답 보기" : undefined
          }
          onKeyDown={!answerRevealed ? handleQuestionKeyDown : undefined}
        >
          <div aria-live="polite">
            <DeckQuizText
              mode={answerRevealed ? "revealed" : "prompt"}
              segments={segments}
              tone={answerRevealed ? "study" : "neutral"}
            />
          </div>
        </div>
        <button
          className="inline-flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inq-ink-soft disabled:cursor-default disabled:text-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          aria-label="다음 카드"
          disabled={!canNext}
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" size={32} strokeWidth={2.2} />
        </button>
      </div>
      {answerRevealed ? (
        <button
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-inq-ink px-[18px] py-3 text-sm font-bold leading-[1.4] text-inq-canvas disabled:cursor-default disabled:bg-inq-line disabled:text-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          aria-label="다음 카드로 이동"
          disabled={!canNext}
          onClick={onNext}
        >
          다음
        </button>
      ) : (
        <button
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-inq-ink px-[18px] py-3 text-sm font-bold leading-[1.4] text-inq-canvas focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          onClick={revealAnswer}
        >
          정답 보기
        </button>
      )}
    </section>
  );
}
