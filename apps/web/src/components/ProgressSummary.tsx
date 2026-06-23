import type { ChallengeProgress } from "@inq/shared";

type ProgressSummaryProps = {
  progress: ChallengeProgress;
};

export function ProgressSummary({ progress }: ProgressSummaryProps) {
  return (
    <span className="progress-summary">
      {progress.completedCards}/{progress.totalCards}
    </span>
  );
}
