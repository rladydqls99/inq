import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type ActionListItemProps = {
  to: string;
  title: string;
  meta?: string;
  trailing?: ReactNode;
};

export function ActionListItem({
  to,
  title,
  meta,
  trailing,
}: ActionListItemProps) {
  return (
    <Link className="action-list-item" to={to}>
      <span className="action-list-item__content">
        <h2>{title}</h2>
        {meta ? <span>{meta}</span> : null}
      </span>
      {trailing ? (
        <span className="action-list-item__trailing">{trailing}</span>
      ) : null}
    </Link>
  );
}
