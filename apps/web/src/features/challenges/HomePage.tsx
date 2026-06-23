import { useEffect, useMemo, useState } from "react";

import type { ChallengeResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { ChallengeListItem } from "./ChallengeListItem";

export function HomePage() {
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    apiRequest<ChallengeResponse[]>("/challenges")
      .then((response) => {
        if (mounted) {
          setChallenges(response.filter((challenge) => challenge.status === "active"));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const sortedChallenges = useMemo(
    () => [...challenges].sort(compareByNextDueAt),
    [challenges],
  );
  const hasDueCards = sortedChallenges.some((challenge) => challenge.dueCount > 0);

  return (
    <section className="page">
      <PageHeader title="Home" />
      {loading ? <div className="list-empty">Loading</div> : null}
      {!loading && sortedChallenges.length === 0 ? (
        <div className="list-empty">No challenges</div>
      ) : null}
      {!loading && sortedChallenges.length > 0 && !hasDueCards ? (
        <div className="list-empty">No due cards</div>
      ) : null}
      <div className="action-list">
        {sortedChallenges.map((challenge) => (
          <ChallengeListItem key={challenge.id} challenge={challenge} />
        ))}
      </div>
    </section>
  );
}

function compareByNextDueAt(left: ChallengeResponse, right: ChallengeResponse) {
  const leftTime = left.nextDueAt ? Date.parse(left.nextDueAt) : Number.POSITIVE_INFINITY;
  const rightTime = right.nextDueAt
    ? Date.parse(right.nextDueAt)
    : Number.POSITIVE_INFINITY;

  return leftTime - rightTime;
}
