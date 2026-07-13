import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { ChallengeCardResponse, ChallengeResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { CardListHeader } from "../../components/CardListHeader";
import { QuizTextRenderer } from "../../components/QuizTextRenderer";

export function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const [cards, setCards] = useState<ChallengeCardResponse[]>([]);
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!challengeId) {
      return;
    }

    let mounted = true;

    apiRequest<ChallengeCardResponse[]>(`/challenges/${challengeId}/cards`)
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

    apiRequest<ChallengeResponse[]>("/challenges")
      .then((response) => {
        if (mounted) {
          setChallenge(response.find((item) => item.id === challengeId) ?? null);
        }
      })
      .catch(() => {
        // The card list remains usable if only its supplementary header data fails.
      });

    return () => {
      mounted = false;
    };
  }, [challengeId]);

  return (
    <section className="page card-list-page">
      <CardListHeader
        context="챌린지 카드"
        title={challenge?.name ?? "챌린지 카드"}
        meta={
          loading
            ? "카드를 불러오는 중"
            : challenge
            ? `${challenge.deckTitle} 덱 · 카드 ${cards.length}장`
            : `카드 ${cards.length}장`
        }
        action={
          challengeId ? (
            <Link className="card-list-header__start" to={`/challenges/${challengeId}/run`}>
              학습 시작
            </Link>
          ) : null
        }
      />
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? <div className="list-empty">챌린지 카드를 불러오지 못했습니다.</div> : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="list-empty">등록된 카드가 없습니다.</div>
      ) : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <QuizTextRenderer
              className="card-editor__revealed"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
            <div className="card-meta-row">
              <span>단계 {card.stage}</span>
              <span>{card.completedAt ? "완료" : "진행 중"}</span>
              <span>{card.dueAt ? `예정 ${formatDate(card.dueAt)}` : "바로 학습"}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
