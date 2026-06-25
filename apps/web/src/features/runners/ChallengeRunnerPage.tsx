import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { ChallengeRunState } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { AutoAdvanceTimer } from "../../components/AutoAdvanceTimer";
import { CardPlayer } from "../../components/CardPlayer";
import { PageHeader } from "../../components/PageHeader";

export function ChallengeRunnerPage() {
  const { challengeId } = useParams();
  const [runState, setRunState] = useState<ChallengeRunState | null>(null);
  const [cursor, setCursor] = useState(0);
  const [selectedResult, setSelectedResult] = useState<"correct" | "wrong" | null>(
    null,
  );

  useEffect(() => {
    if (!challengeId) {
      return;
    }

    let mounted = true;

    apiRequest<ChallengeRunState>(`/challenges/${challengeId}/run`).then(
      (response) => {
        if (mounted) {
          setRunState(response);
          setCursor(response.cursor);
          setSelectedResult(response.cards[response.cursor]?.selectedResult ?? null);
        }
      },
    );

    return () => {
      mounted = false;
    };
  }, [challengeId]);

  if (!challengeId || !runState) {
    return <div className="list-empty">Loading</div>;
  }

  const currentCard = runState.cards[cursor];

  if (!currentCard || runState.status === "completed") {
    return (
      <section className="page">
        <PageHeader title="Challenge Run" />
        <div className="list-empty">Completed</div>
      </section>
    );
  }

  async function submitResult(result: "correct" | "wrong") {
    if (!challengeId || !currentCard) {
      return;
    }

    setSelectedResult(result);
    const response = await apiRequest<{ runState: ChallengeRunState }>(
      `/challenges/${challengeId}/results`,
      {
        method: "POST",
        body: JSON.stringify({
          sessionCardId: currentCard.sessionCardId,
          finalResult: result,
        }),
      },
    );
    setRunState(response.runState);
  }

  function moveTo(nextCursor: number) {
    if (!runState) {
      return;
    }

    const boundedCursor = Math.min(
      Math.max(nextCursor, 0),
      Math.max(runState.cards.length - 1, 0),
    );

    setCursor(boundedCursor);
    setSelectedResult(runState.cards[boundedCursor]?.selectedResult ?? null);
  }

  return (
    <section className="page">
      <PageHeader title="Challenge Run" />
      <div className="runner-surface">
        <CardPlayer
          key={currentCard.sessionCardId}
          mode="challenge"
          segments={currentCard.segments}
          selectedResult={selectedResult}
          onPrevious={() => moveTo(cursor - 1)}
          onNext={() => moveTo(cursor + 1)}
          onResult={(result) => void submitResult(result)}
        />
        {selectedResult ? (
          <div className="runner-next">
            <AutoAdvanceTimer seconds={5} />
            <button type="button" onClick={() => moveTo(cursor + 1)}>
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
