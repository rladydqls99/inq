import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getRevealedText, type ChallengeCardResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";

export function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const [cards, setCards] = useState<ChallengeCardResponse[]>([]);
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

    return () => {
      mounted = false;
    };
  }, [challengeId]);

  return (
    <section className="page">
      <PageHeader title="챌린지 카드" />
      {challengeId ? (
        <Link className="primary-link-button" to={`/challenges/${challengeId}/run`}>
          학습 시작
        </Link>
      ) : null}
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? <div className="list-empty">챌린지 카드를 불러오지 못했습니다.</div> : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="list-empty">등록된 카드가 없습니다.</div>
      ) : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.id} className="card-editor">
            <p className="card-editor__revealed">{getRevealedText(card.segments)}</p>
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
