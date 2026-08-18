import { useState } from "react";

import { Flag, Plus } from "lucide-react";
import {
  useChallengeMutation,
  useChallenges,
  useDeleteChallenge,
  useUpdateChallengeFromDeck,
} from "@/entities/challenges/api";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Skeleton } from "@/shared/ui/skeleton";
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
    <section className="grid gap-6">
      <div className="border-b border-inq-line pb-5">
        <PageHeader title="챌린지" description="오늘의 복습 흐름을 이어가요." />
      </div>
      <div className="grid gap-2" aria-live="polite">
        {updateMessage ? (
          <div
            className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-ink"
            role="status"
          >
            {updateMessage}
          </div>
        ) : null}
        {updateError ? (
          <div
            className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error"
            role="alert"
          >
            챌린지를 업데이트하지 못했습니다.
          </div>
        ) : null}
        {renameError ? (
          <div
            className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error"
            role="alert"
          >
            챌린지 이름을 저장하지 못했습니다.
          </div>
        ) : null}
        {deleteError ? (
          <div
            className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error"
            role="alert"
          >
            챌린지를 삭제하지 못했습니다.
          </div>
        ) : null}
      </div>
      {loading ? <ChallengeListSkeleton /> : null}
      {!loading && loadError ? (
        <div className="grid gap-3 rounded-xl bg-inq-surface p-4" role="alert">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
              챌린지 목록을 불러오지 못했습니다.
            </h2>
            <p className="m-0 text-sm text-inq-ink-soft">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
          <button
            className="min-h-12 cursor-pointer rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas"
            type="button"
            onClick={() => void refetch()}
          >
            다시 시도
          </button>
        </div>
      ) : null}
      {!loading && !loadError && challenges.length === 0 ? (
        <div className="grid gap-3 rounded-xl bg-inq-surface p-4">
          <span
            className="inline-grid size-11 place-items-center rounded-lg bg-inq-highlight text-inq-on-highlight"
            aria-hidden="true"
          >
            <Flag size={22} strokeWidth={2.2} />
          </span>
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
              등록된 챌린지가 없습니다.
            </h2>
            <p className="m-0 text-sm text-inq-ink-soft">
              덱을 골라 복습 주기를 만들면, 오늘 풀 문제를 홈에서 바로 시작할 수
              있어요.
            </p>
          </div>
          <button
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas"
            type="button"
            onClick={() => setCreateModalOpen(true)}
          >
            챌린지 등록하기
          </button>
        </div>
      ) : null}
      <div className="grid border-t border-inq-line">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="grid"
            data-testid={`challenge-row-${challenge.id}`}
          >
            <ChallengeListItem
              challenge={challenge}
              action={
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
              }
            />
            {editingChallengeId === challenge.id ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
                <label className="grid gap-1 text-sm font-bold">
                  챌린지 이름
                  <Input
                    className="min-h-11 px-3"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                </label>
                <Button
                  size="compact"
                  type="button"
                  onClick={() => void saveChallengeName(challenge.id)}
                >
                  저장
                </Button>
                <Button
                  size="compact"
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingChallengeId(null)}
                >
                  취소
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {showFloatingAdd ? (
        <Button
          className="fixed right-5 bottom-[calc(var(--bottom-tab-height)+env(safe-area-inset-bottom,0px)+16px)] z-10 shadow-[0_2px_8px_rgb(13_22_15_/_12%)]"
          size="floating"
          aria-label="챌린지 등록"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </Button>
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
    <div className="grid gap-2" role="status">
      <span className="sr-only">챌린지를 불러오는 중입니다.</span>
      {[0, 1].map((item) => (
        <div
          className="grid min-h-32 gap-3 rounded-lg bg-inq-surface p-3 animate-pulse motion-reduce:animate-none"
          key={item}
          aria-hidden="true"
        >
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-1 w-full" />
        </div>
      ))}
    </div>
  );
}
