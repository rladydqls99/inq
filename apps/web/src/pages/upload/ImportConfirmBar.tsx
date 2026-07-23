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
    <div className="upload-actions">
      {createdMessage ? <span role="status">{createdMessage}</span> : null}
      <button
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
