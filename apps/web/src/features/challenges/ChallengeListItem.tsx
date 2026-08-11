import type { ChallengeResponse } from "@inq/shared";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ProgressSummary } from "@/shared/ui/ProgressSummary";

type ChallengeListItemProps = {
  challenge: ChallengeResponse;
  to?: string;
  action?: ReactNode;
};

export function ChallengeListItem({
  challenge,
  to,
  action,
}: ChallengeListItemProps) {
  const dueCopy =
    challenge.dueCount > 0
      ? `오늘 ${challenge.dueCount}장 학습 예정`
      : "오늘 학습 완료";
  const accessibleLabel = [
    challenge.name,
    challenge.deckTitle,
    dueCopy,
    `전체 ${challenge.progress.totalCards}장 중 ${challenge.progress.completedCards}장 완료`,
  ].join(", ");

  return (
    <div className="flex min-h-[120px] items-start justify-between rounded-lg border border-inq-line bg-inq-canvas p-3">
      <Link
        className="grid min-w-0 flex-1 gap-2 text-inq-ink no-underline focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.99]"
        to={to ?? `/challenges/${challenge.id}/cards`}
        aria-label={accessibleLabel}
      >
        <span className="grid min-w-0 gap-1">
          <h2 className="m-0 overflow-hidden text-base font-bold text-ellipsis whitespace-nowrap">
            {challenge.name}
          </h2>
          <span className="overflow-hidden text-[13px] font-semibold text-ellipsis whitespace-nowrap text-inq-ink-soft">
            {challenge.deckTitle}
          </span>
        </span>
        <span
          className={
            challenge.dueCount > 0
              ? "inline-flex items-center gap-1.5 text-[13px] font-bold text-inq-ink"
              : "inline-flex items-center gap-1.5 text-[13px] font-bold text-inq-success"
          }
        >
          <span
            className={`size-2 rounded-full ${challenge.dueCount > 0 ? "bg-inq-highlight-strong" : "bg-inq-success"}`}
            aria-hidden="true"
          />
          {dueCopy}
        </span>
        <ProgressSummary
          progress={challenge.progress}
          intervalsDays={challenge.reviewIntervalsDays}
          label={`${challenge.name} 전체 진도`}
        />
      </Link>
      {action ? <div className="ml-2 shrink-0">{action}</div> : null}
    </div>
  );
}
