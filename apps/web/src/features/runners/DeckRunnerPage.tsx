import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import type { DeckRunResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { AutoAdvanceTimer } from "../../components/AutoAdvanceTimer";
import { CardPlayer } from "../../components/CardPlayer";
import { PageHeader } from "../../components/PageHeader";
import { attachMediaSessionHandlers } from "./MediaSessionController";

export function DeckRunnerPage() {
  const { deckId } = useParams();
  const [runState, setRunState] = useState<DeckRunResponse | null>(null);
  const [cursor, setCursor] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [moveError, setMoveError] = useState(false);
  const [restartError, setRestartError] = useState(false);

  useEffect(() => {
    if (!deckId) {
      return;
    }

    let mounted = true;

    apiRequest<DeckRunResponse>(`/decks/${deckId}/run`)
      .then((response) => {
        if (mounted) {
          setRunState(response);
          setCursor(response.cursor);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [deckId]);

  useEffect(() => {
    if (!runState || runState.completedAt || cursor >= runState.cards.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void moveTo(cursor + 1);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [cursor, runState]);

  useEffect(() => {
    return attachMediaSessionHandlers({
      onNext: () => void moveTo(cursor + 1),
      onPrevious: () => void moveTo(cursor - 1),
    });
  }, [cursor, runState]);

  if (loadError) {
    return <div className="list-empty">덱 실행 정보를 불러오지 못했습니다.</div>;
  }

  if (!deckId || !runState) {
    return <div className="list-empty">Loading</div>;
  }

  const currentCard = runState.cards[cursor];
  const completed = Boolean(runState.completedAt) || cursor >= runState.cards.length;

  async function moveTo(nextCursor: number) {
    if (!deckId || !runState) {
      return;
    }

    const boundedCursor = Math.min(
      Math.max(nextCursor, 0),
      runState.cards.length,
    );

    setMoveError(false);

    try {
      const nextRunState = await apiRequest<DeckRunResponse>(`/decks/${deckId}/run`, {
        method: "PATCH",
        body: JSON.stringify({ cursor: boundedCursor }),
      });

      setRunState(nextRunState);
      setCursor(nextRunState.cursor);
    } catch {
      setMoveError(true);
    }
  }

  async function restart() {
    if (!deckId) {
      return;
    }

    setRestartError(false);

    try {
      const nextRunState = await apiRequest<DeckRunResponse>(
        `/decks/${deckId}/run/restart`,
        { method: "POST" },
      );
      setRunState(nextRunState);
      setCursor(nextRunState.cursor);
    } catch {
      setRestartError(true);
    }
  }

  if (completed || !currentCard) {
    return (
      <section className="page">
        <PageHeader title="Deck Run" />
        <div className="runner-surface">
          <div className="list-empty">Completed</div>
          <div className="runner-next">
            <button type="button" onClick={() => void restart()}>
              Restart
            </button>
          </div>
          {restartError ? <div className="list-empty">덱을 다시 시작하지 못했습니다.</div> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <PageHeader title="Deck Run" />
      <div className="runner-surface">
        <CardPlayer
          key={currentCard.cardId}
          mode="study"
          segments={currentCard.segments}
          onPrevious={() => void moveTo(cursor - 1)}
          onNext={() => void moveTo(cursor + 1)}
        />
        <div className="runner-next">
          <AutoAdvanceTimer seconds={10} />
        </div>
        {moveError ? <div className="list-empty">카드를 이동하지 못했습니다.</div> : null}
      </div>
    </section>
  );
}
