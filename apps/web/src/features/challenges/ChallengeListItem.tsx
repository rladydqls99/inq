import type { ChallengeResponse } from "@inq/shared";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type ChallengeListItemProps = {
  challenge: ChallengeResponse;
  to?: string;
  action?: ReactNode;
};

export function ChallengeListItem({
  challenge,
  to,
  action,
}: ChallengeListItemProps) {
  const dueCopy =
    challenge.dueCount > 0
      ? `오늘 ${challenge.dueCount}장 학습 예정`
      : "오늘 학습 완료";
  const stageProgress = [
    {
      label: "바로 풀기",
      count: challenge.progress.currentStageCounts[0] ?? 0,
    },
    ...challenge.reviewIntervalsDays.map((days, index) => ({
      label: `${days}일`,
      count: challenge.progress.currentStageCounts[index + 1] ?? 0,
    })),
  ];
  const stageProgressCopy = stageProgress
    .map(({ label, count }) => `${label} ${count}장 남음`)
    .join(", ");
  const accessibleLabel = [
    challenge.name,
    challenge.deckTitle,
    dueCopy,
    `전체 ${challenge.progress.totalCards}장 중 ${challenge.progress.completedCards}장 완료`,
    `단계별 남은 카드: ${stageProgressCopy}`,
  ].join(", ");

  const completion =
    challenge.progress.totalCards > 0
      ? Math.min(
          100,
          Math.round(
            (challenge.progress.completedCards /
              challenge.progress.totalCards) *
              100,
          ),
        )
      : 0;

  return (
    <div className="flex min-h-[112px] items-center justify-between gap-2 border-b border-inq-line py-4">
      <Link
        className="grid min-w-0 flex-1 gap-3 rounded-md py-1 text-inq-ink no-underline transition-[background-color,transform] duration-180 hover:bg-inq-surface focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.99] motion-reduce:transition-none"
        to={to ?? `/challenges/${challenge.id}/cards`}
        aria-label={accessibleLabel}
      >
        <span className="grid min-w-0 gap-1.5">
          <h2 className="m-0 overflow-hidden text-base font-bold text-ellipsis whitespace-nowrap">
            {challenge.name}
          </h2>
          <span className="overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap text-inq-ink-soft">
            {challenge.deckTitle}
          </span>
        </span>
        <span className="grid gap-1.5">
          <span
            className={
              challenge.dueCount > 0
                ? "inline-flex items-center gap-1.5 text-sm font-bold text-inq-ink"
                : "inline-flex items-center gap-1.5 text-sm font-bold text-inq-success"
            }
          >
            <span
              className={`size-2 rounded-full ${challenge.dueCount > 0 ? "bg-inq-highlight-strong" : "bg-inq-success"}`}
              aria-hidden="true"
            />
            {dueCopy}
          </span>
          <span className="grid gap-1.5 text-sm font-medium text-inq-ink-soft">
            <span className="shrink-0">
              {challenge.progress.completedCards}/
              {challenge.progress.totalCards}장 완료
            </span>
            <span
              className="h-1 w-full overflow-hidden rounded-full bg-inq-line"
              role="progressbar"
              aria-label={`${challenge.name} 전체 진도`}
              aria-valuemin={0}
              aria-valuemax={challenge.progress.totalCards}
              aria-valuenow={challenge.progress.completedCards}
            >
              <span
                className="block h-full origin-left bg-inq-highlight-strong transition-transform duration-180 motion-reduce:transition-none"
                style={{ transform: `scaleX(${completion / 100})` }}
              />
            </span>
            <span
              className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold leading-5 text-inq-ink-soft"
              aria-label={`단계별 남은 카드: ${stageProgressCopy}`}
            >
              {stageProgress.map(({ label, count }) => (
                <span className="whitespace-nowrap" key={label}>
                  {label} {count}장
                </span>
              ))}
            </span>
          </span>
        </span>
      </Link>
      {action ? <div className="ml-2 shrink-0">{action}</div> : null}
    </div>
  );
}
