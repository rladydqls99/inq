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
  const ariaValue = Math.min(
    ariaMaximum,
    Math.max(0, progress.completedCards),
  );
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
    <span className="progress-summary">
      <span className="progress-summary__overall">
        <span className="progress-summary__copy">
          <span>전체 진도</span>
          <span className="progress-summary__value">
            <strong>{progress.completedCards}</strong>
            <span aria-hidden="true"> / </span>
            {progress.totalCards}장
          </span>
        </span>
        <span
          className="progress-summary__track"
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
        <span className="term-progress-summary">
          <span className="term-progress-summary__label">텀별 완료</span>
          <span className="term-progress-summary__items">
            {termProgress.map((term, termIndex) => (
              <span
                className="term-progress-summary__item"
                key={`${term.days}-${termIndex}`}
              >
                <span className="term-progress-summary__copy">
                  <span>{term.days}일</span>
                  <span className="term-progress-summary__value">
                    <strong>{term.completedCards}</strong>/{progress.totalCards}
                  </span>
                </span>
                <span
                  className="term-progress-summary__track"
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
