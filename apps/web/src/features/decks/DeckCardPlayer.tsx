import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import {
  useRef,
  type KeyboardEvent,
  type MouseEvent,
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
  onAnswerReveal,
}: DeckCardPlayerProps) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const displayIndex = Math.min(Math.max(currentIndex + 1, 1), totalCards);
  const progress = totalCards === 0 ? 0 : (displayIndex / totalCards) * 100;

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
          role="progressbar"
          aria-label="카드 학습 진행률"
          aria-valuemin={1}
          aria-valuemax={totalCards}
          aria-valuenow={displayIndex}
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
