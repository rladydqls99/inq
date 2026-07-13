import type { ChallengeResponse } from "@inq/shared";
import { Link } from "react-router-dom";

import { ProgressSummary } from "../../components/ProgressSummary";

type ChallengeListItemProps = {
  challenge: ChallengeResponse;
  to?: string;
};

export function ChallengeListItem({ challenge, to }: ChallengeListItemProps) {
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
    <Link
      className="challenge-list-item"
      to={to ?? `/challenges/${challenge.id}/cards`}
      aria-label={accessibleLabel}
    >
      <span className="challenge-list-item__heading">
        <h2>{challenge.name}</h2>
        <span>{challenge.deckTitle}</span>
      </span>
      <span
        className={
          challenge.dueCount > 0
            ? "challenge-list-item__due"
            : "challenge-list-item__due is-complete"
        }
      >
        <span className="challenge-list-item__due-mark" aria-hidden="true" />
        {dueCopy}
      </span>
      <ProgressSummary
        progress={challenge.progress}
        intervalsDays={challenge.reviewIntervalsDays}
        label={`${challenge.name} 전체 진도`}
      />
    </Link>
  );
}
