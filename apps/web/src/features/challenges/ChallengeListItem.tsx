import type { ChallengeResponse } from "@inq/shared";

import { ActionListItem } from "../../components/ActionListItem";
import { ProgressSummary } from "../../components/ProgressSummary";

type ChallengeListItemProps = {
  challenge: ChallengeResponse;
  to?: string;
};

export function ChallengeListItem({ challenge, to }: ChallengeListItemProps) {
  return (
    <ActionListItem
      to={to ?? `/challenges/${challenge.id}/cards`}
      title={challenge.name}
      meta={`${challenge.deckTitle} · 학습 예정 ${challenge.dueCount}장`}
      trailing={<ProgressSummary progress={challenge.progress} />}
    />
  );
}
