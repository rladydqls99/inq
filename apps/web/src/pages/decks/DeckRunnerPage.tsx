import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import type { DeckRunResponse } from "@inq/shared";
import {
  useDeckRun,
  useDeleteDeck,
  useMoveDeckRun,
} from "@/entities/decks/api";
import { DeckCardPlayer } from "@/features/decks/DeckCardPlayer";
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

export function DeckRunnerPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const deleteMutation = useDeleteDeck();
  const [deleteError, setDeleteError] = useState(false);
  const [moveError, setMoveError] = useState(false);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const { data: runState, isError: loadError } = useDeckRun(deckId);
  const moveMutation = useMoveDeckRun(deckId);
  const cursor = runState?.cursor ?? 0;
  const [vehicleControlEnabled, setVehicleControlEnabled] = useState(
    isVehicleControlEnabled,
  );
  const [vehicleControlStatus, setVehicleControlStatus] =
    useState<VehicleControlStatus>(() =>
      isVehicleControlEnabled() ? "preparing" : "disabled",
    );
  const runStateRef = useRef<DeckRunResponse | null>(null);
  const cursorRef = useRef(0);
  const revealedCardIdRef = useRef<string | null>(null);
  const movingRef = useRef(false);
  const moveToRef = useRef<(nextCursor: number) => Promise<void>>(
    async () => {},
  );
  const mediaControllerRef = useRef<VehicleMediaSessionController | null>(null);

  runStateRef.current = runState ?? null;
  cursorRef.current = cursor;
  revealedCardIdRef.current = revealedCardId;

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

  async function deleteDeck() {
    if (!deckId || deleteMutation.isPending) return;

    setDeleteError(false);

    try {
      await deleteMutation.mutateAsync(deckId);
      navigate("/decks");
    } catch {
      setDeleteError(true);
    }
  }

  const moveTo = useCallback(
    async (nextCursor: number) => {
      const currentRunState = runStateRef.current;
      const currentCursor = cursorRef.current;

      if (!deckId || !currentRunState || movingRef.current) {
        return;
      }

      const boundedCursor = Math.min(
        Math.max(nextCursor, 0),
        currentRunState.cards.length,
      );

      if (boundedCursor === currentCursor) {
        return;
      }

      movingRef.current = true;
      setMoveError(false);

      try {
        const nextRunState = await moveMutation.mutateAsync(boundedCursor);

        runStateRef.current = nextRunState;
        cursorRef.current = nextRunState.cursor;
      } catch {
        setMoveError(true);
      } finally {
        movingRef.current = false;
      }
    },
    [deckId, moveMutation],
  );

  moveToRef.current = moveTo;

  const activeDeckId = runState?.deckId;

  useEffect(() => {
    if (
      !activeDeckId ||
      !runStateRef.current ||
      runStateRef.current.cards.length === 0 ||
      runStateRef.current.completedAt
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
      deckTitle: currentRunState.deckTitle,
      currentIndex: cursorRef.current,
      totalCards: currentRunState.cards.length,
      onNext: () => {
        const currentCard = runStateRef.current?.cards[cursorRef.current];

        if (currentCard && revealedCardIdRef.current !== currentCard.cardId) {
          setRevealedCardId(currentCard.cardId);
          return;
        }

        void moveToRef.current(cursorRef.current + 1);
      },
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
  }, [activeDeckId, vehicleControlEnabled]);

  useEffect(() => {
    if (!runState) {
      return;
    }

    mediaControllerRef.current?.updateMetadata(
      runState.deckTitle,
      cursor,
      runState.cards.length,
    );
  }, [cursor, runState]);

  useEffect(() => {
    return () => {
      releasePrimedVehicleControl();
    };
  }, []);

  const currentCard = runState?.cards[cursor];
  if (loadError) {
    return (
      <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
        덱 실행 정보를 불러오지 못했습니다.
      </div>
    );
  }

  if (!deckId || !runState) {
    return (
      <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
        불러오는 중입니다.
      </div>
    );
  }

  const completed =
    Boolean(runState.completedAt) || cursor >= runState.cards.length;

  if (completed || !currentCard) {
    return <Navigate to="/decks" replace />;
  }

  return (
    <section className="grid gap-4">
      <PageHeader title="덱 학습" />
      <div className="grid min-h-[calc(100dvh-11rem)] gap-4">
        <VehicleControlNotice
          status={vehicleControlEnabled ? vehicleControlStatus : "disabled"}
          onRetry={() => void mediaControllerRef.current?.prepare()}
        />
        <div className="flex justify-end">
          <button
            className="cursor-pointer rounded-lg border-0 bg-transparent px-3 text-sm font-bold text-inq-error disabled:cursor-not-allowed disabled:text-inq-ink-soft"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => void deleteDeck()}
          >
            {deleteMutation.isPending ? "삭제 중" : "삭제"}
          </button>
        </div>
        <DeckCardPlayer
          key={currentCard.cardId}
          segments={currentCard.segments}
          currentIndex={cursor}
          totalCards={runState.cards.length}
          answerRevealed={revealedCardId === currentCard.cardId}
          canPrevious={!moveMutation.isPending && cursor > 0}
          canNext={!moveMutation.isPending && cursor < runState.cards.length}
          onPrevious={() => void moveTo(cursor - 1)}
          onNext={() => void moveTo(cursor + 1)}
          onMoveTo={(index) => void moveTo(index)}
          onAnswerReveal={() => setRevealedCardId(currentCard.cardId)}
        />
        {moveError ? (
          <div className="text-sm font-bold text-inq-error" role="alert">
            카드를 이동하지 못했습니다.
          </div>
        ) : null}
        {deleteError ? (
          <div className="text-sm font-bold text-inq-error" role="alert">
            덱을 삭제하지 못했습니다.
          </div>
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
      className={`flex justify-between items-center gap-2 rounded-lg bg-inq-surface px-3 py-2 text-sm font-bold ${status === "failed" ? "text-inq-error" : status === "ready" ? "text-inq-success" : "text-inq-ink-soft"}`}
      role="status"
      aria-live="polite"
    >
      <span>{copy[status]}</span>
      {status !== "failed" ? (
        <div className="flex justify-self-end">
          <button
            className="cursor-pointer rounded-lg border border-inq-line bg-inq-canvas px-3 text-sm font-bold text-inq-ink"
            type="button"
            onClick={onRetry}
          >
            다시 시도
          </button>
        </div>
      ) : null}
    </div>
  );
}
