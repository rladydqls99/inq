import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { ChallengeRunCard, ChallengeRunState } from "@inq/shared";
import {
  useChallengeRun,
  useMoveChallengeRun,
  useSubmitChallengeResult,
} from "@/entities/challenges/api";
import { CardPlayer } from "@/shared/ui/CardPlayer";
import { PageHeader } from "@/shared/ui/PageHeader";

export function ChallengeRunnerPage() {
  const { challengeId } = useParams();
  const [answeredCard, setAnsweredCard] = useState<ChallengeRunCard | null>(
    null,
  );
  const [nextCursorAfterAnswer, setNextCursorAfterAnswer] = useState<
    number | null
  >(null);
  const [moveError, setMoveError] = useState(false);
  const [resultError, setResultError] = useState(false);
  const { data: runState, isError: loadError } = useChallengeRun(challengeId);
  const moveMutation = useMoveChallengeRun(challengeId);
  const resultMutation = useSubmitChallengeResult(challengeId);
  const cursor = runState?.cursor ?? 0;
  const selectedResult =
    (answeredCard ?? runState?.cards[cursor])?.selectedResult ?? null;
  const moveTo = useCallback(
    async (nextCursor: number) => {
      if (!runState) return;

      const boundedCursor = Math.min(
        Math.max(nextCursor, 0),
        runState.cards.length,
      );
      setMoveError(false);

      try {
        await moveMutation.mutateAsync(boundedCursor);
        setAnsweredCard(null);
        setNextCursorAfterAnswer(null);
        setResultError(false);
      } catch {
        setMoveError(true);
      }
    },
    [moveMutation, runState],
  );

  useEffect(() => {
    if (!selectedResult || !answeredCard || !runState) return;

    const timer = window.setTimeout(() => {
      void moveTo(nextCursorAfterAnswer ?? cursor + 1);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [
    answeredCard,
    cursor,
    moveTo,
    nextCursorAfterAnswer,
    runState,
    selectedResult,
  ]);

  if (loadError) {
    return (
      <div className="list-empty">챌린지 실행 정보를 불러오지 못했습니다.</div>
    );
  }

  if (!challengeId || !runState) {
    return <div className="list-empty">불러오는 중입니다.</div>;
  }

  const currentCard = answeredCard ?? runState.cards[cursor];

  if (!currentCard || runState.status === "completed") {
    return (
      <section className="page">
        <PageHeader title="챌린지 학습" />
        <div className="list-empty">완료되었습니다.</div>
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
      const response = await resultMutation.mutateAsync({
        sessionCardId: currentCard.sessionCardId,
        finalResult: result,
      });
      setAnsweredCard({ ...currentCard, selectedResult: result });
      setNextCursorAfterAnswer(
        nextCursorForAnsweredCard(
          response.runState,
          currentCard.sessionCardId,
          cursor,
        ),
      );
    } catch {
      setResultError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="챌린지 학습" />
      <div className="runner-surface">
        <CardPlayer
          key={currentCard.sessionCardId}
          mode="challenge"
          segments={currentCard.segments}
          currentIndex={cursor}
          totalCards={runState.cards.length}
          selectedResult={selectedResult}
          {...(answeredCard && selectedResult ? { autoAdvanceSeconds: 5 } : {})}
          canPrevious={cursor > 0}
          canNext={cursor < runState.cards.length}
          onPrevious={() => void moveTo(cursor - 1)}
          onNext={() => void moveTo(nextCursorAfterAnswer ?? cursor + 1)}
          onResult={(result) => void submitResult(result)}
        />
        {resultError ? (
          <div className="list-empty">결과를 저장하지 못했습니다.</div>
        ) : null}
        {moveError ? (
          <div className="list-empty">카드를 이동하지 못했습니다.</div>
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
