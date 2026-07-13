import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { useRef, useState, type TouchEvent } from "react";

import type { QuizSegment } from "@inq/shared";
import {
  QuizTextRenderer,
  type AnswerTone,
} from "./QuizTextRenderer";
import { AutoAdvanceTimer } from "./AutoAdvanceTimer";

type CardPlayerProps = {
  segments: QuizSegment[];
  mode: "challenge" | "study";
  currentIndex: number;
  totalCards: number;
  selectedResult?: "correct" | "wrong" | null;
  autoAdvanceSeconds?: number;
  canPrevious?: boolean;
  canNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onResult?: (result: "correct" | "wrong") => void;
};

export function CardPlayer({
  segments,
  mode,
  currentIndex,
  totalCards,
  selectedResult = null,
  autoAdvanceSeconds,
  canPrevious = true,
  canNext = true,
  onPrevious,
  onNext,
  onResult,
}: CardPlayerProps) {
  const [answerRevealed, setAnswerRevealed] = useState(selectedResult !== null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const revealed = answerRevealed || selectedResult !== null;
  const tone: AnswerTone =
    mode === "study" ? "study" : selectedResult === "wrong" ? "wrong" : "correct";
  const displayIndex = Math.min(Math.max(currentIndex + 1, 1), totalCards);
  const progress = totalCards === 0 ? 0 : (displayIndex / totalCards) * 100;

  function selectResult(result: "correct" | "wrong") {
    setAnswerRevealed(true);
    onResult?.(result);
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

    if (!start || !touch) {
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX > 0 && canPrevious) {
      onPrevious?.();
    } else if (deltaX < 0 && canNext) {
      onNext?.();
    }
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

      <div className="card-player__stage">
        <button
          className="card-player__nav-button"
          type="button"
          aria-label="이전 카드"
          disabled={!canPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" size={32} strokeWidth={2.2} />
        </button>

        <div className="card-player__question" aria-live="polite">
          <QuizTextRenderer
            mode={revealed ? "revealed" : "prompt"}
            segments={segments}
            tone={revealed ? tone : "neutral"}
          />
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

      {mode === "challenge" ? (
        <div className="card-player__result-controls" aria-label="학습 결과">
          <button
            className="card-player__result-button is-wrong"
            type="button"
            aria-pressed={selectedResult === "wrong"}
            onClick={() => selectResult("wrong")}
          >
            <X aria-hidden="true" size={20} strokeWidth={2.4} />
            틀렸어요
          </button>
          <button
            className="card-player__result-button is-correct"
            type="button"
            aria-pressed={selectedResult === "correct"}
            onClick={() => selectResult("correct")}
          >
            <Check aria-hidden="true" size={20} strokeWidth={2.4} />
            맞았어요
          </button>
        </div>
      ) : null}

      {mode === "challenge" && selectedResult ? (
        <button
          className="card-player__reveal-button is-next"
          type="button"
          disabled={!canNext}
          onClick={onNext}
        >
          <span>다음 문제</span>
          <span className="card-player__next-meta">
            {autoAdvanceSeconds ? (
              <AutoAdvanceTimer
                key={selectedResult}
                seconds={autoAdvanceSeconds}
              />
            ) : null}
            <ChevronRight aria-hidden="true" size={20} strokeWidth={2.2} />
          </span>
        </button>
      ) : !revealed ? (
        <button
          className="card-player__reveal-button"
          type="button"
          onClick={() => setAnswerRevealed(true)}
        >
          <Eye aria-hidden="true" size={20} strokeWidth={2.2} />
          정답 보기
        </button>
      ) : (
        <p className="card-player__answer-status">
          <Check aria-hidden="true" size={18} strokeWidth={2.4} />
          정답을 확인했어요
        </p>
      )}
    </section>
  );
}
