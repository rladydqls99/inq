import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { ChallengeRunCard, ChallengeRunState } from "@inq/shared";
import {
  useChallengeRun,
  useMoveChallengeRun,
  useSubmitChallengeResult,
} from "@/entities/challenges/api";
import { ChallengeCardPlayer } from "@/features/challenges/ChallengeCardPlayer";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useVoiceAnswer } from "@/widgets/useVoiceAnswer";
import {
  isVoiceAnswerEnabled,
  VOICE_ANSWER_CHANGE_EVENT,
  VOICE_ANSWER_STORAGE_KEY,
} from "@/widgets/voiceAnswerSettings";

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
  const [revealedAnswerIds, setRevealedAnswerIds] = useState<string[]>([]);
  const { data: runState, isError: loadError } = useChallengeRun(challengeId);
  const moveMutation = useMoveChallengeRun(challengeId);
  const resultMutation = useSubmitChallengeResult(challengeId);
  const cursor = runState?.cursor ?? 0;
  const [voiceAnswerEnabled, setVoiceAnswerEnabled] =
    useState(isVoiceAnswerEnabled);
  const [pageVisible, setPageVisible] = useState(
    () => document.visibilityState !== "hidden",
  );
  const runStateRef = useRef<ChallengeRunState | null>(null);
  const answeredCardRef = useRef<ChallengeRunCard | null>(null);
  const cursorRef = useRef(0);
  const movingRef = useRef(false);
  const submittingResultRef = useRef(false);
  const matchedAnswerIdsRef = useRef(new Set<string>());
  const selectedResult =
    (answeredCard ?? runState?.cards[cursor])?.selectedResult ?? null;
  const currentCard = answeredCard ?? runState?.cards[cursor];

  runStateRef.current = runState ?? null;
  answeredCardRef.current = answeredCard;
  cursorRef.current = cursor;

  useEffect(() => {
    function syncSetting(event: Event) {
      if (
        event instanceof StorageEvent &&
        event.key !== VOICE_ANSWER_STORAGE_KEY
      )
        return;
      setVoiceAnswerEnabled(
        event instanceof CustomEvent && typeof event.detail === "boolean"
          ? event.detail
          : isVoiceAnswerEnabled(),
      );
    }
    window.addEventListener("storage", syncSetting);
    window.addEventListener(VOICE_ANSWER_CHANGE_EVENT, syncSetting);
    return () => {
      window.removeEventListener("storage", syncSetting);
      window.removeEventListener(VOICE_ANSWER_CHANGE_EVENT, syncSetting);
    };
  }, []);

  useEffect(() => {
    function syncVisibility() {
      setPageVisible(document.visibilityState !== "hidden");
    }
    document.addEventListener("visibilitychange", syncVisibility);
    return () =>
      document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  const moveTo = useCallback(
    async (nextCursor: number) => {
      const currentRunState = runStateRef.current;
      const currentCursor = cursorRef.current;

      if (!challengeId || !currentRunState || movingRef.current) {
        return;
      }

      const boundedCursor = Math.min(
        Math.max(nextCursor, 0),
        currentRunState.cards.length,
      );

      if (boundedCursor === currentCursor && !answeredCardRef.current) {
        return;
      }

      movingRef.current = true;
      setMoveError(false);

      try {
        const nextRunState = await moveMutation.mutateAsync(boundedCursor);

        runStateRef.current = nextRunState;
        cursorRef.current = nextRunState.cursor;
        answeredCardRef.current = null;
        submittingResultRef.current = false;
        setAnsweredCard(null);
        setNextCursorAfterAnswer(null);
        setResultError(false);
      } catch {
        setMoveError(true);
      } finally {
        movingRef.current = false;
      }
    },
    [challengeId, moveMutation],
  );

  const submitResult = useCallback(
    async (result: "correct" | "wrong") => {
      if (!challengeId || !currentCard || submittingResultRef.current) {
        return;
      }

      submittingResultRef.current = true;
      setResultError(false);
      setMoveError(false);

      try {
        const response = await resultMutation.mutateAsync({
          sessionCardId: currentCard.sessionCardId,
          finalResult: result,
        });
        const answered = { ...currentCard, selectedResult: result };
        answeredCardRef.current = answered;
        setAnsweredCard(answered);
        setNextCursorAfterAnswer(
          nextCursorForAnsweredCard(
            response.runState,
            currentCard.sessionCardId,
            cursor,
          ),
        );
      } catch {
        submittingResultRef.current = false;
        setResultError(true);
      }
    },
    [challengeId, currentCard, cursor, resultMutation],
  );

  const voiceAnswers = useMemo(
    () =>
      currentCard?.segments.flatMap((segment) =>
        segment.type === "answer"
          ? [{ id: segment.id, value: segment.value }]
          : [],
      ) ?? [],
    [currentCard],
  );

  useEffect(() => {
    matchedAnswerIdsRef.current = new Set();
    setRevealedAnswerIds([]);
  }, [currentCard?.sessionCardId]);

  const voiceFeedback = useVoiceAnswer({
    enabled: voiceAnswerEnabled,
    answers: voiceAnswers,
    active: Boolean(pageVisible && currentCard && !selectedResult),
    onMatch: (answerIds) => {
      answerIds.forEach((id) => matchedAnswerIdsRef.current.add(id));
      setRevealedAnswerIds([...matchedAnswerIdsRef.current]);
      if (
        voiceAnswers.length > 0 &&
        voiceAnswers.every((answer) =>
          matchedAnswerIdsRef.current.has(answer.id),
        )
      ) {
        void submitResult("correct");
      }
    },
  });

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

  if (!currentCard || runState.status === "completed") {
    return (
      <section className="page">
        <PageHeader title="챌린지 학습" />
        <div className="list-empty">완료되었습니다.</div>
      </section>
    );
  }

  return (
    <section className="page">
      <PageHeader title="챌린지 학습" />
      <div className="runner-surface">
        <ChallengeCardPlayer
          key={currentCard.sessionCardId}
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
          revealedAnswerIds={revealedAnswerIds}
          showWrongAnswers={voiceFeedback?.status === "wrong"}
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
