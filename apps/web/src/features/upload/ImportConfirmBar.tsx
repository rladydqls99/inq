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
      <button type="button" disabled={!canCreate} onClick={() => void onConfirm()}>
        Create cards
      </button>
      {createdMessage ? <span>{createdMessage}</span> : null}
    </div>
  );
}
