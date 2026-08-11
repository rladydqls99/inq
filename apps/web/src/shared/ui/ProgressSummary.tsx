import type { ChallengeProgress } from "@inq/shared";

type ProgressSummaryProps = {
  progress: ChallengeProgress;
  intervalsDays: number[];
  label?: string;
};

export function ProgressSummary({
  progress,
  intervalsDays,
  label = "전체 진도",
}: ProgressSummaryProps) {
  const ariaMaximum = Math.max(1, progress.totalCards);
  const ariaValue = Math.min(ariaMaximum, Math.max(0, progress.completedCards));
  const completion =
    progress.totalCards > 0
      ? Math.min(
          100,
          Math.max(0, (progress.completedCards / progress.totalCards) * 100),
        )
      : 0;
  const termProgress = intervalsDays.map((days, termIndex) => {
    // A review term is complete after the card advances beyond its scheduled stage.
    const minimumStageAfterTerm = termIndex + 2;
    const advancedCards = Object.entries(progress.currentStageCounts).reduce(
      (sum, [stage, count]) =>
        Number(stage) >= minimumStageAfterTerm ? sum + count : sum,
      0,
    );
    const completedCards = Math.min(
      progress.totalCards,
      progress.completedCards + advancedCards,
    );

    return {
      days,
      completedCards,
      completion:
        progress.totalCards > 0
          ? Math.min(1, Math.max(0, completedCards / progress.totalCards))
          : 0,
    };
  });

  return (
    <span className="grid gap-2 text-[13px] font-bold text-inq-success">
      <span className="grid gap-1">
        <span className="flex items-baseline justify-between gap-2 text-inq-ink-soft">
          <span>전체 진도</span>
          <span className="text-inq-ink">
            <strong>{progress.completedCards}</strong>
            <span aria-hidden="true"> / </span>
            {progress.totalCards}장
          </span>
        </span>
        <span
          className="h-1 overflow-hidden rounded-full bg-inq-line [&>span]:block [&>span]:h-full [&>span]:origin-left [&>span]:bg-inq-highlight-strong"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={ariaMaximum}
          aria-valuenow={ariaValue}
          aria-valuetext={`${progress.totalCards}장 중 ${progress.completedCards}장 완료`}
        >
          <span style={{ transform: `scaleX(${completion / 100})` }} />
        </span>
      </span>
      {termProgress.length > 0 ? (
        <span className="grid gap-1.5 text-inq-ink-soft">
          <span className="text-xs font-bold">텀별 완료</span>
          <span className="grid gap-1.5">
            {termProgress.map((term, termIndex) => (
              <span className="grid gap-1" key={`${term.days}-${termIndex}`}>
                <span className="flex items-baseline justify-between gap-2 text-xs font-bold text-inq-ink-soft">
                  <span>{term.days}일</span>
                  <span className="text-inq-ink">
                    <strong>{term.completedCards}</strong>/{progress.totalCards}
                  </span>
                </span>
                <span
                  className="h-1 overflow-hidden rounded-full bg-inq-line [&>span]:block [&>span]:h-full [&>span]:origin-left [&>span]:bg-inq-highlight-strong"
                  role="progressbar"
                  aria-label={`${term.days}일 텀 완료`}
                  aria-valuemin={0}
                  aria-valuemax={ariaMaximum}
                  aria-valuenow={Math.min(ariaMaximum, term.completedCards)}
                  aria-valuetext={`${progress.totalCards}장 중 ${term.completedCards}장 완료`}
                >
                  <span style={{ transform: `scaleX(${term.completion})` }} />
                </span>
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </span>
  );
}
