import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { ChallengeRunCard, ChallengeRunState } from "@inq/shared";
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
  const [answeredCard, setAnsweredCard] = useState<ChallengeRunCard | null>(null);
  const [nextCursorAfterAnswer, setNextCursorAfterAnswer] = useState<number | null>(
    null,
  );
  const [moveError, setMoveError] = useState(false);
  const [resultError, setResultError] = useState(false);

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

  useEffect(() => {
    if (!selectedResult || !answeredCard || !runState) {
      return;
    }

    const timer = window.setTimeout(() => {
      void moveTo(nextCursorAfterAnswer ?? cursor + 1);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [answeredCard, cursor, nextCursorAfterAnswer, runState, selectedResult]);

  if (!challengeId || !runState) {
    return <div className="list-empty">Loading</div>;
  }

  const currentCard = answeredCard ?? runState.cards[cursor];

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

    setResultError(false);
    setMoveError(false);

    try {
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
      setSelectedResult(result);
      setRunState(response.runState);
      setAnsweredCard(currentCard);
      setNextCursorAfterAnswer(
        nextCursorForAnsweredCard(response.runState, currentCard.sessionCardId, cursor),
      );
    } catch {
      setSelectedResult(null);
      setResultError(true);
    }
  }

  async function moveTo(nextCursor: number) {
    if (!runState) {
      return;
    }

    const boundedCursor = Math.min(
      Math.max(nextCursor, 0),
      runState.cards.length,
    );

    setMoveError(false);

    try {
      const nextRunState = await apiRequest<ChallengeRunState>(
        `/challenges/${runState.challengeId}/run`,
        {
          method: "PATCH",
          body: JSON.stringify({ cursor: boundedCursor }),
        },
      );

      setAnsweredCard(null);
      setNextCursorAfterAnswer(null);
      setResultError(false);
      setRunState(nextRunState);
      setCursor(nextRunState.cursor);
      setSelectedResult(
        nextRunState.cards[nextRunState.cursor]?.selectedResult ?? null,
      );
    } catch {
      setMoveError(true);
    }
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
          onPrevious={() => void moveTo(cursor - 1)}
          onNext={() => void moveTo(nextCursorAfterAnswer ?? cursor + 1)}
          onResult={(result) => void submitResult(result)}
        />
        {resultError ? <div className="list-empty">결과를 저장하지 못했습니다.</div> : null}
        {moveError ? <div className="list-empty">카드를 이동하지 못했습니다.</div> : null}
        {selectedResult ? (
          <div className="runner-next">
            <AutoAdvanceTimer seconds={5} />
            <button
              type="button"
              onClick={() => void moveTo(nextCursorAfterAnswer ?? cursor + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function nextCursorForAnsweredCard(
  runState: ChallengeRunState,
  sessionCardId: string,
  currentCursor: number,
) {
  const updatedIndex = runState.cards.findIndex(
    (card) => card.sessionCardId === sessionCardId,
  );

  if (updatedIndex !== -1 && updatedIndex !== currentCursor) {
    return currentCursor;
  }

  return Math.min(currentCursor + 1, runState.cards.length);
}
