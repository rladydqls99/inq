import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import type { DeckRunResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { CardPlayer } from "../../components/CardPlayer";
import { PageHeader } from "../../components/PageHeader";
import { attachMediaSessionHandlers } from "./MediaSessionController";

export function DeckRunnerPage() {
  const { deckId } = useParams();
  const [runState, setRunState] = useState<DeckRunResponse | null>(null);
  const [cursor, setCursor] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [moveError, setMoveError] = useState(false);

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
    return attachMediaSessionHandlers({
      onNext: () => void moveTo(cursor + 1),
      onPrevious: () => void moveTo(cursor - 1),
    });
  }, [cursor, runState]);

  if (loadError) {
    return <div className="list-empty">덱 실행 정보를 불러오지 못했습니다.</div>;
  }

  if (!deckId || !runState) {
    return <div className="list-empty">불러오는 중입니다.</div>;
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

  if (completed || !currentCard) {
    return <Navigate to="/decks" replace />;
  }

  return (
    <section className="page">
      <PageHeader title="덱 학습" />
      <div className="runner-surface">
        <CardPlayer
          key={currentCard.cardId}
          mode="study"
          segments={currentCard.segments}
          currentIndex={cursor}
          totalCards={runState.cards.length}
          initiallyRevealed
          canPrevious={cursor > 0}
          canNext={cursor < runState.cards.length}
          onPrevious={() => void moveTo(cursor - 1)}
          onNext={() => void moveTo(cursor + 1)}
        />
        {moveError ? <div className="list-empty">카드를 이동하지 못했습니다.</div> : null}
      </div>
    </section>
  );
}
