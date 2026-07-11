import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

type ActionMenuProps = {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ActionMenu({ label, open, onToggle, children }: ActionMenuProps) {
  return (
    <div className="action-menu">
      <button
        type="button"
        className="icon-button"
        aria-label={label}
        aria-expanded={open}
        onClick={onToggle}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open ? <div className="action-menu__panel">{children}</div> : null}
    </div>
  );
}
