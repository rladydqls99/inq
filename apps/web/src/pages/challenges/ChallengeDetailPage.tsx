import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useChallengeCards, useChallenges } from "@/entities/challenges/api";
import { CardListHeader } from "@/shared/ui/CardListHeader";
import { QuizTextRenderer } from "@/shared/ui/QuizTextRenderer";

export function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const {
    data: cards = [],
    isPending: loading,
    isError: loadError,
  } = useChallengeCards(challengeId);
  const { data: challenges = [] } = useChallenges();
  const challenge = useMemo(
    () => challenges.find((item) => item.id === challengeId),
    [challengeId, challenges],
  );

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
            <Link
              className="card-list-header__start"
              to={`/challenges/${challengeId}/run`}
            >
              학습 시작
            </Link>
          ) : null
        }
      />
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? (
        <div className="list-empty">챌린지 카드를 불러오지 못했습니다.</div>
      ) : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="list-empty">등록된 카드가 없습니다.</div>
      ) : null}
      <div className="card-editor-list">
        {cards.map((card) => (
          <article key={card.challengeCardId} className="card-editor">
            <QuizTextRenderer
              className="card-editor__revealed"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
            <div className="card-meta-row">
              <span>단계 {card.stage}</span>
              <span>{card.completedAt ? "완료" : "진행 중"}</span>
              <span>
                {card.dueAt ? `예정 ${formatDate(card.dueAt)}` : "바로 학습"}
              </span>
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
