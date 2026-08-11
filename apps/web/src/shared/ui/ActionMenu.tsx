import { MoreVertical } from "lucide-react";
import type { ReactNode } from "react";

type ActionMenuProps = {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ActionMenu({
  label,
  open,
  onToggle,
  children,
}: ActionMenuProps) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-inq-ink-soft hover:bg-inq-surface hover:text-inq-ink focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98] motion-reduce:transition-none"
        aria-label={label}
        aria-expanded={open}
        onClick={onToggle}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute top-[calc(100%+4px)] right-0 z-20 grid min-w-36 overflow-hidden rounded-lg border border-inq-line bg-inq-canvas py-1 shadow-[0_2px_8px_rgb(13_22_15_/_12%)] [&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-left [&_button]:text-sm [&_button]:font-bold [&_button]:text-inq-ink [&_button:hover]:bg-inq-surface [&_button:disabled]:cursor-not-allowed [&_button:disabled]:text-inq-ink-soft [&_button:focus-visible]:outline-3 [&_button:focus-visible]:outline-inq-highlight-strong [&_button:focus-visible]:outline-offset-[-3px]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
