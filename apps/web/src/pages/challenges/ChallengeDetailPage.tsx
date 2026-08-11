import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

import { useChallengeCards, useChallenges } from "@/entities/challenges/api";
import { ChallengeQuizText } from "@/features/challenges/ChallengeQuizText";

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
    <section className="grid gap-4">
      <header className="grid gap-2">
        <p className="m-0 text-sm font-bold text-inq-ink-soft">챌린지 카드</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <h1 className="m-0 text-[1.75rem] font-extrabold leading-[1.25] tracking-[-0.025em] text-balance">
              {challenge?.name ?? "챌린지 카드"}
            </h1>
            <p className="m-0 text-sm font-medium text-inq-ink-soft">
              {loading
                ? "카드를 불러오는 중"
                : challenge
                  ? `${challenge.deckTitle} 덱 · 카드 ${cards.length}장`
                  : `카드 ${cards.length}장`}
            </p>
          </div>
          {challengeId ? (
            <div>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas no-underline active:scale-[0.98]"
                to={`/challenges/${challengeId}/run`}
              >
                학습 시작
              </Link>
            </div>
          ) : null}
        </div>
      </header>
      {loading ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          불러오는 중입니다.
        </div>
      ) : null}
      {loadError ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          챌린지 카드를 불러오지 못했습니다.
        </div>
      ) : null}
      {!loading && !loadError && cards.length === 0 ? (
        <div className="mt-[18px] text-sm font-bold text-inq-ink-soft">
          등록된 카드가 없습니다.
        </div>
      ) : null}
      <div className="grid gap-2">
        {cards.map((card) => (
          <article
            key={card.challengeCardId}
            className="grid gap-3 rounded-lg border border-inq-line bg-inq-canvas p-4"
          >
            <ChallengeQuizText
              className="text-base leading-[1.6]"
              mode="revealed"
              segments={card.segments}
              tone="study"
            />
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold text-inq-ink-soft [&_span+span]:before:mr-2 [&_span+span]:before:content-['·']">
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
