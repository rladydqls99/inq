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
    <section
      className="mx-auto flex min-h-full w-full max-w-[40rem] flex-col"
      aria-labelledby="home-page-title"
    >
      <header className="mb-8 grid gap-2">
        <h1
          id="home-page-title"
          className="m-0 text-[1.75rem] font-extrabold leading-[1.25] tracking-[-0.025em] text-inq-ink text-balance"
        >
          오늘의 복습
        </h1>
        <p className="m-0 max-w-[65ch] text-base leading-[1.6] font-medium text-inq-ink-soft text-pretty">
          직접 만든 문제로, 오늘도 가볍게.
        </p>
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
    <section className="flex flex-col" aria-labelledby="featured-review-title">
      <div className="grid gap-2">
        <p className="m-0 mb-1 text-sm font-bold leading-[1.4] text-inq-on-highlight">
          <span
            className="inline-block rounded bg-inq-highlight p-1"
            aria-label={`오늘 풀 문제는 ${challenge.dueCount}개입니다.`}
          >
            {challenge.dueCount}문제
          </span>
        </p>
        <h2
          id="featured-review-title"
          className="m-0 line-clamp-2 text-[1.75rem] font-extrabold leading-[1.25] tracking-[-0.025em] text-inq-ink text-balance"
          title={challenge.name}
        >
          {challenge.name}
        </h2>
        <p className="m-0 max-w-[65ch] text-base leading-[1.6] font-medium text-inq-ink-soft text-pretty">
          {challenge.deckTitle}
        </p>
      </div>
      <Link
        className="mt-6 inline-flex min-h-12 w-full items-center justify-between rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold leading-[1.4] text-inq-canvas no-underline transition-[background-color,color,transform] duration-180 hover:bg-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-ink focus-visible:outline-offset-3 active:scale-[0.98] active:bg-inq-highlight-strong active:text-inq-on-highlight motion-reduce:transition-none"
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
    <section
      className="flex items-start gap-3 rounded-xl bg-inq-surface p-4"
      aria-labelledby="completed-review-title"
    >
      <span
        className="inline-grid size-8 shrink-0 place-items-center rounded-full bg-inq-highlight text-inq-on-highlight"
        aria-hidden="true"
      >
        <Check size={20} strokeWidth={2.6} />
      </span>
      <div>
        <h2
          id="completed-review-title"
          className="m-0 text-xl font-bold leading-[1.35] tracking-[-0.015em] text-inq-ink text-balance"
        >
          오늘 복습 완료
        </h2>
        <p
          className="mt-1 m-0 max-w-[65ch] text-base leading-[1.6] font-medium text-inq-ink-soft text-pretty"
          aria-live="polite"
        >
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
    <section className="mt-12" aria-labelledby="upcoming-reviews-title">
      <h2
        id="upcoming-reviews-title"
        className="m-0 text-xl font-bold leading-[1.35] tracking-[-0.015em] text-inq-ink text-balance"
      >
        다음 복습
      </h2>
      <div className="mt-3 border-t border-inq-line">
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
              className="flex min-h-[72px] items-center justify-between gap-3 border-b border-inq-line py-4 text-inq-ink no-underline transition-[background-color,transform] duration-180 hover:bg-inq-surface focus-visible:outline-3 focus-visible:outline-inq-ink focus-visible:outline-offset-3 active:scale-[0.99] motion-reduce:transition-none"
              key={challenge.id}
              to={destination}
            >
              <span className="grid min-w-0 gap-1">
                <span
                  className="line-clamp-2 text-base font-bold leading-[1.4] text-inq-ink"
                  title={challenge.name}
                >
                  {challenge.name}
                </span>
                <span
                  className="flex flex-wrap gap-x-2 text-xs font-medium leading-[1.4] text-inq-ink-soft [&_span+span]:before:mr-2 [&_span+span]:before:content-['·']"
                  aria-hidden="true"
                >
                  <span>{challenge.deckTitle}</span>
                  <span>{secondaryCopy}</span>
                </span>
                <span className="sr-only">
                  {`덱은 ${challenge.deckTitle}입니다. ${secondaryCopy} 챌린지 보기.`}
                </span>
              </span>
              <ArrowRight
                className="shrink-0 text-inq-ink-soft"
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
      className="mx-auto flex min-h-full w-full max-w-[40rem] flex-col pt-2"
      aria-labelledby="home-loading-title"
      aria-live="polite"
      aria-busy="true"
    >
      <h1 id="home-loading-title" className="sr-only">
        오늘의 복습을 불러오는 중입니다.
      </h1>
      <div
        className="home-skeleton h-[35px] w-[min(60%,15rem)] animate-pulse rounded-lg bg-inq-surface motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div
        className="home-skeleton mt-2 h-[26px] w-[min(80%,22rem)] animate-pulse rounded-lg bg-inq-surface motion-reduce:animate-none"
        aria-hidden="true"
      />
      <div className="mt-8 grid gap-2" aria-hidden="true">
        <div className="home-skeleton h-6 w-16 rounded-lg bg-inq-line" />
        <div className="home-skeleton h-[35px] w-[90%] rounded-lg bg-inq-line" />
        <div className="home-skeleton h-[35px] w-[62%] rounded-lg bg-inq-line" />
        <div className="home-skeleton h-[26px] w-[40%] rounded-lg bg-inq-line" />
        <div className="home-skeleton mt-4 h-12 w-full rounded-lg bg-inq-line" />
      </div>
      <div className="mt-12 grid gap-3 py-4" aria-hidden="true">
        <div className="home-skeleton h-[27px] w-28 rounded-lg bg-inq-line" />
        <div className="home-skeleton h-[72px] w-full rounded-lg bg-inq-line" />
        <div className="home-skeleton h-[72px] w-full rounded-lg bg-inq-line" />
      </div>
    </section>
  );
}

function HomeErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section
      className="mx-auto flex min-h-full w-full max-w-[40rem] flex-col justify-center py-12"
      aria-labelledby="home-error-title"
    >
      <div className="grid w-full max-w-lg gap-4">
        <div className="grid gap-4" role="alert">
          <h1
            id="home-error-title"
            className="m-0 text-[1.75rem] font-extrabold leading-[1.25] tracking-[-0.025em] text-inq-ink text-balance"
          >
            복습 목록을 가져오지 못했어요
          </h1>
          <p className="m-0 max-w-[65ch] text-base leading-[1.6] font-medium text-inq-ink-soft text-pretty">
            인터넷 연결을 확인한 뒤 다시 시도해 주세요. 만든 문제와 복습 기록은
            그대로 보관되어 있어요.
          </p>
        </div>
        <button
          className="mt-2 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas active:scale-[0.98]"
          type="button"
          onClick={onRetry}
        >
          다시 시도
        </button>
      </div>
    </section>
  );
}

function HomeEmptyState() {
  return (
    <section
      className="mx-auto flex min-h-full w-full max-w-[40rem] flex-col justify-center py-12"
      aria-labelledby="home-empty-title"
    >
      <div className="grid w-full max-w-lg gap-4">
        <h1
          id="home-empty-title"
          className="m-0 text-[1.75rem] font-extrabold leading-[1.25] tracking-[-0.025em] text-inq-ink text-balance"
        >
          첫 복습을 만들어 보세요
        </h1>
        <p className="m-0 max-w-[65ch] text-base leading-[1.6] font-medium text-inq-ink-soft text-pretty">
          직접 만든 문제를 챌린지로 묶으면, 오늘 풀 문제를 홈에서 바로 시작할 수
          있어요.
        </p>
        <Link
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas no-underline active:scale-[0.98]"
          to="/challenges"
        >
          챌린지 만들기
        </Link>
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
