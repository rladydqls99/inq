import { Check, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";

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
  initiallyRevealed?: boolean;
  autoAdvanceSeconds?: number;
  canPrevious?: boolean;
  canNext?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onResult?: (result: "correct" | "wrong") => void;
  onAnswerReveal?: () => void;
};

export function CardPlayer({
  segments,
  mode,
  currentIndex,
  totalCards,
  selectedResult = null,
  initiallyRevealed = false,
  autoAdvanceSeconds,
  canPrevious = true,
  canNext = true,
  onPrevious,
  onNext,
  onResult,
  onAnswerReveal,
}: CardPlayerProps) {
  const [answerRevealed, setAnswerRevealed] = useState(
    initiallyRevealed || selectedResult !== null,
  );
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const revealed = initiallyRevealed || answerRevealed || selectedResult !== null;
  const tone: AnswerTone =
    mode === "study" ? "study" : selectedResult === "wrong" ? "wrong" : "correct";
  const displayIndex = Math.min(Math.max(currentIndex + 1, 1), totalCards);
  const progress = totalCards === 0 ? 0 : (displayIndex / totalCards) * 100;

  function selectResult(result: "correct" | "wrong") {
    setAnswerRevealed(true);
    onResult?.(result);
  }

  function revealAnswer() {
    if (revealed) {
      return;
    }

    setAnswerRevealed(true);
    onAnswerReveal?.();
  }

  function handleStageClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    if (
      mode !== "study" ||
      revealed ||
      (target instanceof Element && target.closest("button"))
    ) {
      return;
    }

    revealAnswer();
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    revealAnswer();
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

      <div
        className={`card-player__stage${
          mode === "study" && !revealed ? " is-revealable" : ""
        }`}
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
          role={mode === "study" && !revealed ? "button" : undefined}
          tabIndex={mode === "study" && !revealed ? 0 : undefined}
          aria-label={
            mode === "study" && !revealed
              ? "카드 영역을 눌러 정답 보기"
              : undefined
          }
          onKeyDown={
            mode === "study" && !revealed
              ? handleQuestionKeyDown
              : undefined
          }
        >
          <div aria-live="polite">
            <QuizTextRenderer
              mode={revealed ? "revealed" : "prompt"}
              segments={segments}
              tone={revealed ? tone : "neutral"}
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

      {(mode === "challenge" && selectedResult) ||
      (mode === "study" && revealed) ? (
        <button
          className="card-player__reveal-button is-next"
          type="button"
          aria-label={mode === "study" ? "다음 카드로 이동" : undefined}
          disabled={!canNext}
          onClick={onNext}
        >
          <span>{mode === "study" ? "다음" : "다음 문제"}</span>
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
          onClick={revealAnswer}
        >
          <Eye aria-hidden="true" size={20} strokeWidth={2.2} />
          정답 보기
        </button>
      ) : null}
    </section>
  );
}
