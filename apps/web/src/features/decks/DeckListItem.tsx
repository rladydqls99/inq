import type { DeckResponse } from "@inq/shared";
import { ChevronRight, Flag } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type DeckListItemProps = {
  deck: DeckResponse;
  action?: ReactNode;
};

export function DeckListItem({ deck, action }: DeckListItemProps) {
  return (
    <div className="flex min-h-[76px] items-center gap-2 border-b border-inq-line py-3">
      <Link
        className="grid min-w-0 flex-1 gap-1 rounded-md py-1 text-inq-ink no-underline transition-[background-color,transform] duration-180 hover:bg-inq-surface focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.99] motion-reduce:transition-none"
        to={`/decks/${deck.id}/manage`}
      >
        <h2 className="m-0 overflow-hidden text-base font-bold text-ellipsis whitespace-nowrap">
          {deck.title}
        </h2>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-inq-ink-soft">
            카드 {deck.cardCount}장
          </span>
          {deck.challengeCount > 0 ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-bold text-inq-ink"
              aria-label={`챌린지 ${deck.challengeCount}개 등록됨`}
            >
              <Flag
                className="shrink-0 text-inq-highlight-strong"
                size={14}
                strokeWidth={2.4}
                aria-hidden="true"
              />
              챌린지 등록됨
            </span>
          ) : null}
        </div>
      </Link>
      {!action ? (
        <ChevronRight
          className="shrink-0 text-inq-ink-soft"
          aria-hidden="true"
          size={18}
          strokeWidth={2.2}
        />
      ) : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
