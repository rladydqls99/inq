import { useEffect, useRef, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import type { CardResponse, DeckResponse, DeckRunResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { CardListHeader } from "../../components/CardListHeader";
import { QuizTextRenderer } from "../../components/QuizTextRenderer";
import {
  primeDeckVehicleControlFromUserGesture,
  releasePrimedDeckVehicleControl,
} from "../runners/MediaSessionController";

export function DeckDetailPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardResponse[]>([]);
  const [deck, setDeck] = useState<DeckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [startError, setStartError] = useState(false);
  const [starting, setStarting] = useState(false);
  const mountedRef = useRef(true);
  const handOffPrimedAudioRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (!handOffPrimedAudioRef.current) {
        releasePrimedDeckVehicleControl();
      }
    };
  }, []);

  useEffect(() => {
    if (!deckId) {
      return;
    }

    let mounted = true;

    apiRequest<CardResponse[]>(`/decks/${deckId}/cards`)
      .then((response) => {
        if (mounted) {
          setCards(response);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    apiRequest<DeckResponse[]>("/decks")
      .then((response) => {
        if (mounted) {
          setDeck(response.find((item) => item.id === deckId) ?? null);
        }
      })
      .catch(() => {
        // The card list remains usable if only its supplementary header data fails.
      });

    return () => {
      mounted = false;
    };
  }, [deckId]);

  async function deleteCard(cardId: string) {
    setDeleteError(false);

    try {
      await apiRequest(`/cards/${cardId}`, { method: "DELETE" });
      setCards((currentCards) => currentCards.filter((card) => card.id !== cardId));
    } catch {
      setDeleteError(true);
    }
  }

  async function startDeckRun() {
    if (!deckId || starting || cards.length === 0) {
      return;
    }

    primeDeckVehicleControlFromUserGesture();
    handOffPrimedAudioRef.current = false;
    setStartError(false);
    setStarting(true);

    try {
      const currentRun = await apiRequest<DeckRunResponse>(
        `/decks/${deckId}/run`,
      );

      if (
        currentRun.completedAt ||
        currentRun.cursor >= currentRun.cards.length
      ) {
        await apiRequest(`/decks/${deckId}/run/restart`, { method: "POST" });
      }

      if (!mountedRef.current) {
        releasePrimedDeckVehicleControl();
        return;
      }

      handOffPrimedAudioRef.current = true;
      navigate(`/decks/${deckId}/run`);
    } catch {
      releasePrimedDeckVehicleControl();

      if (mountedRef.current) {
        setStartError(true);
      }
    } finally {
      if (mountedRef.current) {
        setStarting(false);
      }
    }
  }

  return (
    <section className="page card-list-page">
      <CardListHeader
        context="덱 카드"
        title={deck?.title ?? "덱 카드"}
        meta={loading ? "카드를 불러오는 중" : `카드 ${cards.length}장`}
        action={
          deckId ? (
            <button
              className="card-list-header__start"
              type="button"
              disabled={loading || cards.length === 0 || starting}
              onClick={() => void startDeckRun()}
            >
              {starting ? "준비 중" : "학습 시작"}
            </button>
          ) : null
        }
      />
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? <div className="list-empty">카드 목록을 불러오지 못했습니다.</div> : null}
      {deleteError ? <div className="list-empty">카드를 삭제하지 못했습니다.</div> : null}
      {startError ? <div className="list-empty">학습을 시작하지 못했습니다.</div> : null}
      {!loading && !loadError && cards.length === 0 ? <div className="list-empty">등록된 카드가 없습니다.</div> : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <QuizTextRenderer
              className="card-editor__revealed"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
            <div className="card-editor__actions">
              <Link className="row-action-link" to={`/cards/${card.id}/edit`}>
                <PencilLine aria-hidden="true" size={17} strokeWidth={2.1} />
                카드 수정
              </Link>
              <button type="button" onClick={() => void deleteCard(card.id)}>
                <Trash2 aria-hidden="true" size={17} strokeWidth={2.1} />
                카드 삭제
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
