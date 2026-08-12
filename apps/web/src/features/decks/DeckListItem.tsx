import type { DeckResponse } from "@inq/shared";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type DeckListItemProps = {
  deck: DeckResponse;
  action?: ReactNode;
};

export function DeckListItem({ deck, action }: DeckListItemProps) {
  return (
    <div className="flex min-h-[72px] items-center gap-2 border-b border-inq-line py-2">
      <Link
        className="grid min-w-0 flex-1 gap-1 text-inq-ink no-underline transition-colors duration-180 hover:text-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.99] motion-reduce:transition-none"
        to={`/decks/${deck.id}/manage`}
      >
        <h2 className="m-0 overflow-hidden text-base font-bold text-ellipsis whitespace-nowrap">
          {deck.title}
        </h2>
        <span className="text-sm font-medium text-inq-ink-soft">
          카드 {deck.cardCount}장
        </span>
      </Link>
      <ChevronRight
        className="shrink-0 text-inq-ink-soft"
        aria-hidden="true"
        size={18}
        strokeWidth={2.2}
      />
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
