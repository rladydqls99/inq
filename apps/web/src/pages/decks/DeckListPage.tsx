import { useState } from "react";

import { BookOpen, Plus } from "lucide-react";
import { useDeckMutation, useDecks, useDeleteDeck } from "@/entities/decks/api";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ChallengeCreateDialog } from "@/widgets/ChallengeCreateDialog";
import { DeckCreateModal } from "@/features/decks/DeckCreateModal";
import { DeckListItem } from "@/features/decks/DeckListItem";

export function DeckListPage() {
  const {
    data: decks = [],
    isPending: loading,
    isError: loadError,
    refetch,
  } = useDecks();
  const deckMutation = useDeckMutation();
  const deleteMutation = useDeleteDeck();
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [renameError, setRenameError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [challengeDeckId, setChallengeDeckId] = useState<string | null>(null);
  const [openMenuDeckId, setOpenMenuDeckId] = useState<string | null>(null);

  function startRenaming(deck: (typeof decks)[number]) {
    setEditingDeckId(deck.id);
    setEditingTitle(deck.title);
    setRenameError(false);
    setOpenMenuDeckId(null);
  }

  async function saveDeckTitle(deckId: string) {
    const title = editingTitle.trim();

    if (!title) {
      return;
    }

    setRenameError(false);

    try {
      await deckMutation.mutateAsync({ id: deckId, title });
      setEditingDeckId(null);
      setEditingTitle("");
    } catch {
      setRenameError(true);
    }
  }

  async function deleteDeck(deckId: string) {
    setDeleteError(false);
    setOpenMenuDeckId(null);

    try {
      await deleteMutation.mutateAsync(deckId);
    } catch {
      setDeleteError(true);
    }
  }

  const showFloatingAdd =
    !loading && !loadError && decks.length > 0 && editingDeckId === null;

  return (
    <section className="grid gap-5">
      <div className="grid gap-2 border-b border-inq-line pb-4">
        <PageHeader title="덱" />
        <p className="m-0 text-sm font-medium text-inq-ink-soft">
          문제를 모아둔 덱을 한눈에 확인하세요.
        </p>
      </div>
      <div className="grid gap-2" aria-live="polite">
        {renameError ? (
          <div
            className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error"
            role="alert"
          >
            덱 이름을 저장하지 못했습니다.
          </div>
        ) : null}
        {deleteError ? (
          <div
            className="rounded-lg bg-inq-surface p-3 text-sm font-bold text-inq-error"
            role="alert"
          >
            덱을 삭제하지 못했습니다.
          </div>
        ) : null}
      </div>
      {loading ? <DeckListSkeleton /> : null}
      {!loading && loadError ? (
        <div className="grid gap-3 rounded-xl bg-inq-surface p-4" role="alert">
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
              덱 목록을 불러오지 못했습니다.
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
      {!loading && !loadError && decks.length === 0 ? (
        <div className="grid gap-3 rounded-xl bg-inq-surface p-4">
          <span
            className="inline-grid size-11 place-items-center rounded-lg bg-inq-highlight text-inq-on-highlight"
            aria-hidden="true"
          >
            <BookOpen size={22} strokeWidth={2.2} />
          </span>
          <div className="grid gap-1">
            <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
              등록된 덱이 없습니다.
            </h2>
            <p className="m-0 text-sm text-inq-ink-soft">
              문제를 덱으로 묶어 자유롭게 학습하거나 챌린지로 복습해 보세요.
            </p>
          </div>
          <button
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-inq-ink px-4 py-3 text-sm font-bold text-inq-canvas"
            type="button"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus size={18} aria-hidden="true" />덱 등록하기
          </button>
        </div>
      ) : null}
      <div>
        {decks.map((deck) => (
          <div
            key={deck.id}
            className="grid"
            data-testid={`deck-row-${deck.id}`}
          >
            <DeckListItem
              deck={deck}
              action={
                <ActionMenu
                  label={`${deck.title} 메뉴`}
                  open={openMenuDeckId === deck.id}
                  onToggle={() =>
                    setOpenMenuDeckId((current) =>
                      current === deck.id ? null : deck.id,
                    )
                  }
                >
                  <button type="button" onClick={() => startRenaming(deck)}>
                    이름 변경
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChallengeDeckId(deck.id);
                      setOpenMenuDeckId(null);
                    }}
                  >
                    챌린지 등록
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteDeck(deck.id)}
                  >
                    삭제
                  </button>
                </ActionMenu>
              }
            />
            {editingDeckId === deck.id ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
                <label className="grid gap-1 text-sm font-bold">
                  덱 이름
                  <Input
                    className="min-h-11 px-3"
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                  />
                </label>
                <Button
                  size="compact"
                  type="button"
                  onClick={() => void saveDeckTitle(deck.id)}
                >
                  저장
                </Button>
                <Button
                  size="compact"
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingDeckId(null)}
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
          className="fixed right-4 bottom-[calc(var(--bottom-tab-height)+env(safe-area-inset-bottom,0px)+16px)] z-10 shadow-[0_2px_8px_rgb(13_22_15_/_12%)]"
          size="floating"
          aria-label="덱 만들기"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </Button>
      ) : null}
      {createModalOpen ? (
        <DeckCreateModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={() => undefined}
        />
      ) : null}
      {challengeDeckId ? (
        <ChallengeCreateDialog
          presetDeckId={challengeDeckId}
          onClose={() => setChallengeDeckId(null)}
          onCreated={() => undefined}
        />
      ) : null}
    </section>
  );
}

function DeckListSkeleton() {
  return (
    <div className="grid gap-2" role="status">
      <span className="sr-only">덱을 불러오는 중입니다.</span>
      {[0, 1].map((item) => (
        <div
          className="grid min-h-16 gap-2 rounded-lg bg-inq-surface p-3 animate-pulse motion-reduce:animate-none"
          key={item}
          aria-hidden="true"
        >
          <span className="h-5 w-3/5 rounded bg-inq-line" />
          <span className="h-4 w-2/5 rounded bg-inq-line" />
        </div>
      ))}
    </div>
  );
}
