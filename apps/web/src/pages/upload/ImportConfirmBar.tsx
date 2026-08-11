import { Plus } from "lucide-react";

type ImportConfirmBarProps = {
  canCreate: boolean;
  createdMessage: string | null;
  onConfirm: () => Promise<void> | void;
};

export function ImportConfirmBar({
  canCreate,
  createdMessage,
  onConfirm,
}: ImportConfirmBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {createdMessage ? (
        <span className="text-sm font-bold text-inq-success" role="status">
          {createdMessage}
        </span>
      ) : null}
      <button
        className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas disabled:cursor-not-allowed disabled:bg-inq-line disabled:text-inq-ink-soft"
        type="button"
        disabled={!canCreate}
        onClick={() => void onConfirm()}
      >
        <Plus aria-hidden="true" size={18} strokeWidth={2.25} />
        카드 만들기
      </button>
    </div>
  );
}
