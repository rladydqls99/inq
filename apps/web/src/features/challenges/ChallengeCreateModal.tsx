import { Modal } from "../../components/Modal";
import { ChallengeForm } from "./ChallengeForm";

type ChallengeCreateModalProps = {
  presetDeckId?: string;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

export function ChallengeCreateModal({
  presetDeckId,
  onClose,
  onCreated,
}: ChallengeCreateModalProps) {
  async function handleCreated() {
    await onCreated();
    onClose();
  }

  return (
    <Modal title="챌린지 등록" onClose={onClose}>
      <ChallengeForm
        {...(presetDeckId ? { presetDeckId } : {})}
        onCreated={handleCreated}
      />
    </Modal>
  );
}
