import type { ChallengeResponse } from "@inq/shared";

import { ActionListItem } from "../../components/ActionListItem";
import { ProgressSummary } from "../../components/ProgressSummary";

type ChallengeListItemProps = {
  challenge: ChallengeResponse;
};

export function ChallengeListItem({ challenge }: ChallengeListItemProps) {
  return (
    <ActionListItem
      to={`/challenges/${challenge.id}/run`}
      title={challenge.name}
      meta={`${challenge.deckTitle} · ${challenge.dueCount} due`}
      trailing={<ProgressSummary progress={challenge.progress} />}
    />
  );
}
