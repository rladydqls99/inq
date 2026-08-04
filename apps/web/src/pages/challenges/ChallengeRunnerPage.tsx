import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { ChallengeRunCard, ChallengeRunState } from "@inq/shared";
import {
  useChallengeRun,
  useMoveChallengeRun,
  useSubmitChallengeResult,
} from "@/entities/challenges/api";
import { CardPlayer } from "@/shared/ui/CardPlayer";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  VehicleMediaSessionController,
  releasePrimedVehicleControl,
  type VehicleControlStatus,
} from "@/widgets/vehicleControl";
import {
  isVehicleControlEnabled,
  VEHICLE_CONTROL_CHANGE_EVENT,
  VEHICLE_CONTROL_STORAGE_KEY,
} from "@/widgets/vehicleControlSettings";

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
  const [vehicleControlEnabled, setVehicleControlEnabled] = useState(
    isVehicleControlEnabled,
  );
  const [vehicleControlStatus, setVehicleControlStatus] =
    useState<VehicleControlStatus>(() =>
      isVehicleControlEnabled() ? "preparing" : "disabled",
    );
  const runStateRef = useRef<ChallengeRunState | null>(null);
  const answeredCardRef = useRef<ChallengeRunCard | null>(null);
  const cursorRef = useRef(0);
  const movingRef = useRef(false);
  const moveToRef = useRef<(nextCursor: number) => Promise<void>>(
    async () => {},
  );
  const mediaControllerRef = useRef<VehicleMediaSessionController | null>(null);
  const selectedResult =
    (answeredCard ?? runState?.cards[cursor])?.selectedResult ?? null;

  runStateRef.current = runState ?? null;
  answeredCardRef.current = answeredCard;
  cursorRef.current = cursor;

  useEffect(() => {
    function syncSetting(event: Event) {
      if (
        event instanceof StorageEvent &&
        event.key !== VEHICLE_CONTROL_STORAGE_KEY
      ) {
        return;
      }

      const enabled =
        event instanceof CustomEvent && typeof event.detail === "boolean"
          ? event.detail
          : isVehicleControlEnabled();
      setVehicleControlEnabled(enabled);
    }

    window.addEventListener("storage", syncSetting);
    window.addEventListener(VEHICLE_CONTROL_CHANGE_EVENT, syncSetting);

    return () => {
      window.removeEventListener("storage", syncSetting);
      window.removeEventListener(VEHICLE_CONTROL_CHANGE_EVENT, syncSetting);
    };
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

  moveToRef.current = moveTo;

  const activeChallengeId = runState?.challengeId;
  const runStatus = runState?.status;

  useEffect(() => {
    if (
      !activeChallengeId ||
      !runStateRef.current ||
      runStateRef.current.cards.length === 0 ||
      runStatus === "completed"
    ) {
      return;
    }

    if (!vehicleControlEnabled) {
      releasePrimedVehicleControl();
      setVehicleControlStatus("disabled");
      return;
    }

    const currentRunState = runStateRef.current;
    const controller = new VehicleMediaSessionController({
      deckTitle: "챌린지 학습",
      currentIndex: cursorRef.current,
      totalCards: currentRunState.cards.length,
      onNext: () => void moveToRef.current(cursorRef.current + 1),
      onPrevious: () => void moveToRef.current(cursorRef.current - 1),
      onStatusChange: setVehicleControlStatus,
    });
    mediaControllerRef.current = controller;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        controller.suspend();
        releasePrimedVehicleControl();
        return;
      }

      void controller.prepare();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.visibilityState === "hidden") {
      controller.suspend();
      releasePrimedVehicleControl();
    } else {
      void controller.prepare();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      controller.destroy();
      releasePrimedVehicleControl();

      if (mediaControllerRef.current === controller) {
        mediaControllerRef.current = null;
      }
    };
  }, [activeChallengeId, runStatus, vehicleControlEnabled]);

  useEffect(() => {
    if (!runState) {
      return;
    }

    mediaControllerRef.current?.updateMetadata(
      "챌린지 학습",
      cursor,
      runState.cards.length,
    );
  }, [cursor, runState]);

  useEffect(() => {
    return () => {
      releasePrimedVehicleControl();
    };
  }, []);

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
      setResultError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="챌린지 학습" />
      <div className="runner-surface">
        <VehicleControlNotice
          status={vehicleControlEnabled ? vehicleControlStatus : "disabled"}
          onRetry={() => void mediaControllerRef.current?.prepare()}
        />
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

function VehicleControlNotice({
  status,
  onRetry,
}: {
  status: VehicleControlStatus;
  onRetry: () => void;
}) {
  const copy: Record<VehicleControlStatus, string> = {
    preparing: "차량 제어 준비 중",
    ready: "차량 제어 준비됨",
    disabled: "설정에서 차량 제어가 꺼져 있습니다.",
    unsupported: "이 브라우저는 차량 제어를 지원하지 않습니다.",
    failed: "차량 제어 준비에 실패했습니다.",
  };

  return (
    <div
      className={`vehicle-control-status is-${status}`}
      role="status"
      aria-live="polite"
    >
      <span>{copy[status]}</span>
      {status === "failed" ? (
        <button type="button" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
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
