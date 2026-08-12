import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-end bg-black/40 p-4 sm:place-items-center"
      role="presentation"
    >
      <section
        className="grid max-h-[calc(100dvh-32px)] w-full max-w-lg gap-4 overflow-auto rounded-lg bg-inq-canvas p-4 text-inq-ink sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-xl font-bold tracking-[-0.015em] text-balance">
            {title}
          </h2>
          <button
            type="button"
            className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-inq-ink-soft hover:bg-inq-surface hover:text-inq-ink focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98]"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
