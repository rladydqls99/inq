import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type ActionListItemProps = {
  to: string;
  title: string;
  meta?: string;
  trailing?: ReactNode;
  action?: ReactNode;
};

export function ActionListItem({
  to,
  title,
  meta,
  trailing,
  action,
}: ActionListItemProps) {
  return (
    <div className="flex min-h-16 items-center justify-between rounded-lg border border-inq-line bg-inq-canvas p-3">
      <Link
        className="grid min-w-0 flex-1 gap-1 text-inq-ink no-underline"
        to={to}
      >
        <span className="grid min-w-0 gap-1">
          <h2 className="m-0 overflow-hidden text-base font-bold text-ellipsis whitespace-nowrap">
            {title}
          </h2>
          {meta ? (
            <span className="text-[13px] font-semibold text-inq-ink-soft">
              {meta}
            </span>
          ) : null}
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </Link>
      {action ? <div className="ml-2 shrink-0">{action}</div> : null}
    </div>
  );
}
