import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
      className="card-player"
      aria-label={`퀴즈 카드 ${displayIndex}/${totalCards}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="card-player__progress">
        <div className="card-player__progress-label">
          <span>학습 진행</span>
          <strong>
            {displayIndex} / {totalCards}
          </strong>
        </div>
        <div
          className="card-player__progress-track"
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
        className={`card-player__stage${!answerRevealed ? " is-revealable" : ""}`}
        onClick={handleStageClick}
      >
        <button
          className="card-player__nav-button"
          type="button"
          aria-label="이전 카드"
          disabled={!canPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" size={32} strokeWidth={2.2} />
        </button>
        <div
          className="card-player__question"
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
          className="card-player__nav-button"
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
          className="card-player__reveal-button is-next"
          type="button"
          aria-label="다음 카드로 이동"
          disabled={!canNext}
          onClick={onNext}
        >
          <span>다음</span>
          <span className="card-player__next-meta">
            <ChevronRight aria-hidden="true" size={20} strokeWidth={2.2} />
          </span>
        </button>
      ) : (
        <button
          className="card-player__reveal-button"
          type="button"
          onClick={revealAnswer}
        >
          <Eye aria-hidden="true" size={20} strokeWidth={2.2} />
          정답 보기
        </button>
      )}
    </section>
  );
}
