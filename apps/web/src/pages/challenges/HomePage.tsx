import { useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";

import type { ChallengeResponse } from "@inq/shared";
import { useChallenges } from "@/entities/challenges/api";

export function HomePage() {
  const {
    data = [],
    isPending: loading,
    isError: loadError,
    refetch,
  } = useChallenges();
  const challenges = data.filter((challenge) => challenge.status === "active");

  const sortedChallenges = useMemo(
    () => [...challenges].sort(compareChallenges),
    [challenges],
  );
  const featuredChallenge = sortedChallenges.find(
    (challenge) => challenge.dueCount > 0,
  );
  const upcomingChallenges = featuredChallenge
    ? sortedChallenges.filter(
        (challenge) => challenge.id !== featuredChallenge.id,
      )
    : sortedChallenges;

  if (loading) {
    return <HomeLoadingState />;
  }

  if (loadError) {
    return <HomeErrorState onRetry={() => void refetch()} />;
  }

  if (sortedChallenges.length === 0) {
    return <HomeEmptyState />;
  }

  return (
    <section className="home-page" aria-labelledby="home-page-title">
      <header className="home-page__header">
        <h1 id="home-page-title">오늘의 복습</h1>
        <p>직접 만든 문제로, 오늘도 가볍게.</p>
      </header>

      {featuredChallenge ? (
        <FeaturedReview challenge={featuredChallenge} />
      ) : (
        <CompletedReview challenges={sortedChallenges} />
      )}

      {upcomingChallenges.length > 0 ? (
        <UpcomingReviews challenges={upcomingChallenges} />
      ) : null}
    </section>
  );
}

function FeaturedReview({ challenge }: { challenge: ChallengeResponse }) {
  return (
    <section className="home-featured" aria-labelledby="featured-review-title">
      <div className="home-featured__content">
        <p className="home-featured__count">
          <span aria-label={`오늘 풀 문제는 ${challenge.dueCount}개입니다.`}>
            {challenge.dueCount}문제
          </span>
        </p>
        <h2 id="featured-review-title" title={challenge.name}>
          {challenge.name}
        </h2>
        <p className="home-featured__deck">{challenge.deckTitle}</p>
      </div>
      <Link
        className="home-primary-action"
        to={`/challenges/${challenge.id}/run`}
      >
        <span>복습 시작</span>
        <ArrowRight aria-hidden="true" size={20} strokeWidth={2.4} />
      </Link>
    </section>
  );
}

function CompletedReview({ challenges }: { challenges: ChallengeResponse[] }) {
  const nextScheduled = challenges.find(
    (challenge) => getValidTimestamp(challenge.nextDueAt) !== null,
  );
  const nextSchedule = nextScheduled
    ? formatNextDueAt(nextScheduled.nextDueAt)
    : null;

  return (
    <section className="home-complete" aria-labelledby="completed-review-title">
      <span className="home-complete__icon" aria-hidden="true">
        <Check size={20} strokeWidth={2.6} />
      </span>
      <div>
        <h2 id="completed-review-title">오늘 복습 완료</h2>
        <p aria-live="polite">
          {nextSchedule
            ? `다음 복습은 ${nextSchedule}에 시작할 수 있어요.`
            : "새 복습 일정이 생기면 이곳에서 바로 알려드릴게요."}
        </p>
      </div>
    </section>
  );
}

function UpcomingReviews({ challenges }: { challenges: ChallengeResponse[] }) {
  return (
    <section className="home-upcoming" aria-labelledby="upcoming-reviews-title">
      <h2 id="upcoming-reviews-title">다음 복습</h2>
      <div className="home-upcoming__list">
        {challenges.map((challenge) => {
          const schedule = formatNextDueAt(challenge.nextDueAt);
          const secondaryCopy =
            challenge.dueCount > 0
              ? `지금 ${challenge.dueCount}문제를 복습할 수 있어요.`
              : schedule
                ? `다음 복습은 ${schedule}입니다.`
                : "다음 복습 일정이 아직 정해지지 않았어요.";
          const destination = `/challenges/${challenge.id}/cards`;

          return (
            <Link
              className="home-upcoming__row"
              key={challenge.id}
              to={destination}
            >
              <span className="home-upcoming__content">
                <span className="home-upcoming__title" title={challenge.name}>
                  {challenge.name}
                </span>
                <span className="home-upcoming__meta" aria-hidden="true">
                  <span>{challenge.deckTitle}</span>
                  <span>{secondaryCopy}</span>
                </span>
                <span className="sr-only">
                  {`덱은 ${challenge.deckTitle}입니다. ${secondaryCopy} 챌린지 보기.`}
                </span>
              </span>
              <ArrowRight
                className="home-upcoming__arrow"
                aria-hidden="true"
                size={20}
                strokeWidth={2.2}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HomeLoadingState() {
  return (
    <section
      className="home-page home-page--loading"
      aria-labelledby="home-loading-title"
      aria-live="polite"
      aria-busy="true"
    >
      <h1 id="home-loading-title" className="sr-only">
        오늘의 복습을 불러오는 중입니다.
      </h1>
      <div
        className="home-skeleton home-skeleton--headline"
        aria-hidden="true"
      />
      <div className="home-skeleton home-skeleton--intro" aria-hidden="true" />
      <div className="home-skeleton-feature" aria-hidden="true">
        <div className="home-skeleton home-skeleton--count" />
        <div className="home-skeleton home-skeleton--title" />
        <div className="home-skeleton home-skeleton--title-short" />
        <div className="home-skeleton home-skeleton--meta" />
        <div className="home-skeleton home-skeleton--button" />
      </div>
      <div className="home-skeleton-list" aria-hidden="true">
        <div className="home-skeleton home-skeleton--section-title" />
        <div className="home-skeleton home-skeleton--row" />
        <div className="home-skeleton home-skeleton--row" />
      </div>
    </section>
  );
}

function HomeErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className="home-page home-state-page"
      aria-labelledby="home-error-title"
    >
      <div className="home-state">
        <div className="home-state__message" role="alert">
          <h1 id="home-error-title">복습 목록을 가져오지 못했어요</h1>
          <p>
            인터넷 연결을 확인한 뒤 다시 시도해 주세요. 만든 문제와 복습 기록은
            그대로 보관되어 있어요.
          </p>
        </div>
        <button type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    </section>
  );
}

function HomeEmptyState() {
  return (
    <section
      className="home-page home-state-page"
      aria-labelledby="home-empty-title"
    >
      <div className="home-state">
        <h1 id="home-empty-title">첫 복습을 만들어 보세요</h1>
        <p>
          직접 만든 문제를 챌린지로 묶으면, 오늘 풀 문제를 홈에서 바로 시작할 수
          있어요.
        </p>
        <Link to="/challenges">챌린지 만들기</Link>
      </div>
    </section>
  );
}

function compareChallenges(left: ChallengeResponse, right: ChallengeResponse) {
  const leftDueNow = left.dueCount > 0;
  const rightDueNow = right.dueCount > 0;

  if (leftDueNow !== rightDueNow) {
    return leftDueNow ? -1 : 1;
  }

  const leftTime = getValidTimestamp(left.nextDueAt);
  const rightTime = getValidTimestamp(right.nextDueAt);

  if (leftTime !== rightTime) {
    return (
      (leftTime ?? Number.POSITIVE_INFINITY) -
      (rightTime ?? Number.POSITIVE_INFINITY)
    );
  }

  const leftCreatedAt = getValidTimestamp(left.createdAt);
  const rightCreatedAt = getValidTimestamp(right.createdAt);

  if (leftCreatedAt !== rightCreatedAt) {
    return (
      (leftCreatedAt ?? Number.POSITIVE_INFINITY) -
      (rightCreatedAt ?? Number.POSITIVE_INFINITY)
    );
  }

  return left.id.localeCompare(right.id);
}

function getValidTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatNextDueAt(value: string | null) {
  const timestamp = getValidTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
