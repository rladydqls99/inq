import { useState } from "react";

import { Flag, Plus } from "lucide-react";
import {
  useChallengeMutation,
  useChallenges,
  useDeleteChallenge,
  useUpdateChallengeFromDeck,
} from "@/entities/challenges/api";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ChallengeCreateModal } from "@/features/challenges/ChallengeCreateModal";
import { ChallengeListItem } from "@/features/challenges/ChallengeListItem";

export function ChallengeListPage() {
  const {
    data: challenges = [],
    isPending: loading,
    isError: loadError,
    refetch,
  } = useChallenges();
  const challengeMutation = useChallengeMutation();
  const deleteMutation = useDeleteChallenge();
  const updateFromDeckMutation = useUpdateChallengeFromDeck();
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [openMenuChallengeId, setOpenMenuChallengeId] = useState<string | null>(
    null,
  );

  async function deleteChallenge(challengeId: string) {
    setDeleteError(false);
    setOpenMenuChallengeId(null);

    try {
      await deleteMutation.mutateAsync(challengeId);
    } catch {
      setDeleteError(true);
    }
  }

  async function updateFromDeck(challengeId: string) {
    setUpdateError(false);
    setOpenMenuChallengeId(null);

    try {
      const result = await updateFromDeckMutation.mutateAsync(challengeId);
      setUpdateMessage(`${result.addedCount}장의 카드가 추가되었습니다.`);
    } catch {
      setUpdateMessage(null);
      setUpdateError(true);
    }
  }

  function startEditing(challenge: (typeof challenges)[number]) {
    setEditingChallengeId(challenge.id);
    setEditingName(challenge.name);
    setRenameError(false);
    setOpenMenuChallengeId(null);
  }

  async function saveChallengeName(challengeId: string) {
    const name = editingName.trim();

    if (!name) {
      return;
    }

    setRenameError(false);

    try {
      await challengeMutation.mutateAsync({ id: challengeId, name });
      setEditingChallengeId(null);
      setEditingName("");
    } catch {
      setRenameError(true);
    }
  }

  const showFloatingAdd =
    !loading &&
    !loadError &&
    challenges.length > 0 &&
    editingChallengeId === null;

  return (
    <section className="page challenge-list-page">
      <div className="challenge-list-page__header">
        <PageHeader title="챌린지" />
        <p>내가 만든 복습 루틴을 한눈에 확인하세요.</p>
      </div>
      <div className="challenge-list-page__notices" aria-live="polite">
        {updateMessage ? (
          <div className="challenge-notice" role="status">
            {updateMessage}
          </div>
        ) : null}
        {updateError ? (
          <div className="challenge-notice is-error" role="alert">
            챌린지를 업데이트하지 못했습니다.
          </div>
        ) : null}
        {renameError ? (
          <div className="challenge-notice is-error" role="alert">
            챌린지 이름을 저장하지 못했습니다.
          </div>
        ) : null}
        {deleteError ? (
          <div className="challenge-notice is-error" role="alert">
            챌린지를 삭제하지 못했습니다.
          </div>
        ) : null}
      </div>
      {loading ? <ChallengeListSkeleton /> : null}
      {!loading && loadError ? (
        <div className="challenge-list-state" role="alert">
          <div className="challenge-list-state__copy">
            <h2>챌린지 목록을 불러오지 못했습니다.</h2>
            <p>잠시 후 다시 시도해 주세요.</p>
          </div>
          <button type="button" onClick={() => void refetch()}>
            다시 시도
          </button>
        </div>
      ) : null}
      {!loading && !loadError && challenges.length === 0 ? (
        <div className="challenge-list-state">
          <span className="challenge-list-state__icon" aria-hidden="true">
            <Flag size={22} strokeWidth={2.2} />
          </span>
          <div className="challenge-list-state__copy">
            <h2>등록된 챌린지가 없습니다.</h2>
            <p>
              덱을 골라 복습 주기를 만들면, 오늘 풀 문제를 홈에서 바로 시작할 수
              있어요.
            </p>
          </div>
          <button type="button" onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            챌린지 등록하기
          </button>
        </div>
      ) : null}
      <div className="action-list">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-row"
            data-testid={`challenge-row-${challenge.id}`}
          >
            <ChallengeListItem challenge={challenge} />
            <ActionMenu
              label={`${challenge.name} 메뉴`}
              open={openMenuChallengeId === challenge.id}
              onToggle={() =>
                setOpenMenuChallengeId((current) =>
                  current === challenge.id ? null : challenge.id,
                )
              }
            >
              <button type="button" onClick={() => startEditing(challenge)}>
                이름 변경
              </button>
              <button
                type="button"
                disabled={!challenge.sourceDeckId}
                title={
                  challenge.sourceDeckId
                    ? undefined
                    : "원본 덱이 삭제되어 카드를 갱신할 수 없습니다."
                }
                onClick={() => void updateFromDeck(challenge.id)}
              >
                덱에서 카드 갱신
              </button>
              <button
                type="button"
                onClick={() => void deleteChallenge(challenge.id)}
              >
                삭제
              </button>
            </ActionMenu>
            {editingChallengeId === challenge.id ? (
              <div className="inline-edit">
                <label>
                  챌린지 이름
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveChallengeName(challenge.id)}
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditingChallengeId(null)}
                >
                  취소
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {showFloatingAdd ? (
        <button
          type="button"
          className="floating-add-button challenge-add-button"
          aria-label="챌린지 등록"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ) : null}
      {createModalOpen ? (
        <ChallengeCreateModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={() => undefined}
        />
      ) : null}
    </section>
  );
}

function ChallengeListSkeleton() {
  return (
    <div className="challenge-list-skeleton" role="status">
      <span className="sr-only">챌린지를 불러오는 중입니다.</span>
      {[0, 1].map((item) => (
        <div
          className="challenge-list-skeleton__item"
          key={item}
          aria-hidden="true"
        >
          <span className="challenge-list-skeleton__title" />
          <span className="challenge-list-skeleton__meta" />
          <span className="challenge-list-skeleton__status" />
          <span className="challenge-list-skeleton__progress" />
        </div>
      ))}
    </div>
  );
}
