import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type TouchEvent } from "react";

import type { QuizSegment } from "@inq/shared";
import { ChallengeQuizText } from "./ChallengeQuizText";

type ChallengeCardPlayerProps = {
  segments: QuizSegment[];
  currentIndex: number;
  totalCards: number;
  selectedResult: "correct" | "wrong" | null;
  autoAdvanceSeconds?: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onResult: (result: "correct" | "wrong") => void;
  revealedAnswerIds?: string[];
  showWrongAnswers?: boolean;
};

export function ChallengeCardPlayer({
  segments,
  currentIndex,
  totalCards,
  selectedResult,
  autoAdvanceSeconds,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onResult,
  revealedAnswerIds = [],
  showWrongAnswers = false,
}: ChallengeCardPlayerProps) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(selectedResult !== null);
  const displayIndex = Math.min(Math.max(currentIndex + 1, 1), totalCards);
  const progress = totalCards === 0 ? 0 : (displayIndex / totalCards) * 100;
  const tone = selectedResult === "wrong" ? "wrong" : "correct";

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
        <div className="card-player__question">
          <div aria-live="polite">
            <ChallengeQuizText
              mode={answerRevealed || selectedResult ? "revealed" : "prompt"}
              segments={segments}
              tone={selectedResult ? tone : "neutral"}
              revealedAnswerIds={revealedAnswerIds}
              showWrongAnswers={showWrongAnswers}
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
      <div className="card-player__result-controls" aria-label="학습 결과">
        <button
          className="card-player__result-button is-wrong"
          type="button"
          aria-pressed={selectedResult === "wrong"}
          onClick={() => {
            setAnswerRevealed(true);
            onResult("wrong");
          }}
        >
          <X aria-hidden="true" size={20} strokeWidth={2.4} />
          틀렸어요
        </button>
        <button
          className="card-player__result-button is-correct"
          type="button"
          aria-pressed={selectedResult === "correct"}
          onClick={() => {
            setAnswerRevealed(true);
            onResult("correct");
          }}
        >
          <Check aria-hidden="true" size={20} strokeWidth={2.4} />
          맞았어요
        </button>
      </div>
      {selectedResult ? (
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
      ) : null}
    </section>
  );
}

function AutoAdvanceTimer({ seconds }: { seconds: number }) {
  const [remainingSeconds, setRemainingSeconds] = useState(seconds);

  useEffect(() => {
    setRemainingSeconds(seconds);
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [seconds]);

  return (
    <span
      className="auto-advance-timer"
      aria-label={`자동 이동까지 ${remainingSeconds}초`}
      aria-live="polite"
    >
      {remainingSeconds}초
    </span>
  );
}
