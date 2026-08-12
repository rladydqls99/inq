import { ChevronLeft, ChevronRight } from "lucide-react";
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
      className="flex min-w-0 flex-1 flex-col gap-6"
      aria-label={`퀴즈 카드 ${displayIndex}/${totalCards}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-4 text-sm font-bold leading-[1.4] text-inq-ink-soft [&_strong]:text-inq-ink [&_strong]:tabular-nums">
          <span>학습 진행</span>
          <strong>
            {displayIndex} / {totalCards}
          </strong>
        </div>
        <div
          className="relative -my-5 h-11 cursor-pointer touch-none before:absolute before:top-5 before:right-0 before:left-0 before:h-1 before:rounded-full before:bg-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 [&>span]:absolute [&>span]:top-5 [&>span]:left-0 [&>span]:h-1 [&>span]:rounded-full [&>span]:bg-inq-highlight-strong [&>span]:transition-[width] [&>span]:duration-180 [&>span]:after:absolute [&>span]:after:top-1/2 [&>span]:after:right-[-6px] [&>span]:after:size-3 [&>span]:after:rounded-full [&>span]:after:bg-inq-highlight-strong [&>span]:after:content-[''] [&>span]:after:-translate-y-1/2 motion-reduce:[&>span]:transition-none"
          role="progressbar"
          aria-label="카드 학습 진행률"
          aria-valuemin={1}
          aria-valuemax={totalCards}
          aria-valuenow={displayIndex}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>
      <div className="grid min-h-[260px] flex-1 grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        <button
          className="inline-flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inq-ink-soft disabled:cursor-default disabled:text-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          aria-label="이전 카드"
          disabled={!canPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft aria-hidden="true" size={32} strokeWidth={2.2} />
        </button>
        <div className="grid w-full max-w-[34rem] place-items-center self-stretch rounded-lg px-0 py-4 text-center">
          <div
            className={
              answerRevealed || selectedResult
                ? "motion-safe:animate-[inq-answer-reveal_180ms_ease-out]"
                : undefined
            }
            aria-live="polite"
          >
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
          className="inline-flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inq-ink-soft disabled:cursor-default disabled:text-inq-line focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          aria-label="다음 카드"
          disabled={!canNext}
          onClick={onNext}
        >
          <ChevronRight aria-hidden="true" size={32} strokeWidth={2.2} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2" aria-label="학습 결과">
        <button
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-[color-mix(in_srgb,var(--inq-error)_10%,var(--inq-canvas))] p-3 text-sm font-bold leading-[1.4] text-inq-error transition-[background-color,color,transform] duration-180 aria-pressed:bg-inq-error aria-pressed:text-inq-canvas focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98] motion-reduce:transition-none"
          type="button"
          aria-pressed={selectedResult === "wrong"}
          onClick={() => {
            setAnswerRevealed(true);
            onResult("wrong");
          }}
        >
          틀렸어요
        </button>
        <button
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-[color-mix(in_srgb,var(--inq-success)_12%,var(--inq-canvas))] p-3 text-sm font-bold leading-[1.4] text-inq-success transition-[background-color,color,transform] duration-180 aria-pressed:bg-inq-success aria-pressed:text-inq-canvas focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98] motion-reduce:transition-none"
          type="button"
          aria-pressed={selectedResult === "correct"}
          onClick={() => {
            setAnswerRevealed(true);
            onResult("correct");
          }}
        >
          맞았어요
        </button>
      </div>
      {!selectedResult ? (
        <button
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-inq-surface px-[18px] py-3 text-sm font-bold leading-[1.4] text-inq-ink focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          onClick={() => setAnswerRevealed(true)}
        >
          정답 보기
        </button>
      ) : null}
      {selectedResult ? (
        <button
          className="relative inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-inq-ink px-[18px] py-3 text-sm font-bold leading-[1.4] text-inq-canvas disabled:cursor-default disabled:bg-inq-line disabled:text-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-3 active:scale-[0.98]"
          type="button"
          disabled={!canNext}
          onClick={onNext}
        >
          <span>다음 문제</span>
          {autoAdvanceSeconds ? (
            <span className="absolute right-[18px]">
              <AutoAdvanceTimer
                key={selectedResult}
                seconds={autoAdvanceSeconds}
              />
            </span>
          ) : null}
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
      className="text-xs font-bold"
      aria-label={`자동 이동까지 ${remainingSeconds}초`}
      aria-live="polite"
    >
      {remainingSeconds}초
    </span>
  );
}
