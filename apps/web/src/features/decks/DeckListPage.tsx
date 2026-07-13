import { useEffect, useState } from "react";

import type { DeckResponse } from "@inq/shared";
import { BookOpen, Plus } from "lucide-react";
import { apiRequest } from "../../api/client";
import { ActionMenu } from "../../components/ActionMenu";
import { ActionListItem } from "../../components/ActionListItem";
import { PageHeader } from "../../components/PageHeader";
import { ChallengeCreateModal } from "../challenges/ChallengeCreateModal";
import { DeckCreateModal } from "./DeckCreateModal";

export function DeckListPage() {
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [renameError, setRenameError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [challengeDeckId, setChallengeDeckId] = useState<string | null>(null);
  const [openMenuDeckId, setOpenMenuDeckId] = useState<string | null>(null);

  async function loadDecks() {
    setLoadError(false);

    try {
      setDecks(await apiRequest<DeckResponse[]>("/decks"));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDecks();
  }, []);

  function startRenaming(deck: DeckResponse) {
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
      await apiRequest(`/decks/${deckId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      setEditingDeckId(null);
      setEditingTitle("");
      await loadDecks();
    } catch {
      setRenameError(true);
    }
  }

  async function deleteDeck(deckId: string) {
    setDeleteError(false);
    setOpenMenuDeckId(null);

    try {
      await apiRequest(`/decks/${deckId}`, { method: "DELETE" });
      await loadDecks();
    } catch {
      setDeleteError(true);
    }
  }

  const showFloatingAdd =
    !loading && !loadError && decks.length > 0 && editingDeckId === null;

  return (
    <section className="page deck-list-page">
      <div className="deck-list-page__header">
        <PageHeader title="덱" />
        <p>문제를 모아둔 덱을 한눈에 확인하세요.</p>
      </div>
      <div className="deck-list-page__notices" aria-live="polite">
        {renameError ? (
          <div className="deck-notice is-error" role="alert">
            덱 이름을 저장하지 못했습니다.
          </div>
        ) : null}
        {deleteError ? (
          <div className="deck-notice is-error" role="alert">
            덱을 삭제하지 못했습니다.
          </div>
        ) : null}
      </div>
      {loading ? <DeckListSkeleton /> : null}
      {!loading && loadError ? (
        <div className="deck-list-state" role="alert">
          <div className="deck-list-state__copy">
            <h2>덱 목록을 불러오지 못했습니다.</h2>
            <p>잠시 후 다시 시도해 주세요.</p>
          </div>
          <button type="button" onClick={() => void loadDecks()}>
            다시 시도
          </button>
        </div>
      ) : null}
      {!loading && !loadError && decks.length === 0 ? (
        <div className="deck-list-state">
          <span className="deck-list-state__icon" aria-hidden="true">
            <BookOpen size={22} strokeWidth={2.2} />
          </span>
          <div className="deck-list-state__copy">
            <h2>등록된 덱이 없습니다.</h2>
            <p>
              문제를 덱으로 묶어 자유롭게 학습하거나 챌린지로 복습해 보세요.
            </p>
          </div>
          <button type="button" onClick={() => setCreateModalOpen(true)}>
            <Plus size={18} aria-hidden="true" />
            덱 등록하기
          </button>
        </div>
      ) : null}
      <div className="action-list">
        {decks.map((deck) => (
          <div
            key={deck.id}
            className="deck-row"
            data-testid={`deck-row-${deck.id}`}
          >
            <ActionListItem
              to={`/decks/${deck.id}/manage`}
              title={deck.title}
              meta={`카드 ${deck.cardCount}장`}
            />
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
              <button type="button" onClick={() => void deleteDeck(deck.id)}>
                삭제
              </button>
            </ActionMenu>
            {editingDeckId === deck.id ? (
              <div className="inline-edit">
                <label>
                  덱 이름
                  <input
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveDeckTitle(deck.id)}
                >
                  저장
                </button>
                <button type="button" onClick={() => setEditingDeckId(null)}>
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
          className="floating-add-button deck-add-button"
          aria-label="덱 만들기"
          onClick={() => setCreateModalOpen(true)}
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ) : null}
      {createModalOpen ? (
        <DeckCreateModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={async () => {
            await loadDecks();
          }}
        />
      ) : null}
      {challengeDeckId ? (
        <ChallengeCreateModal
          presetDeckId={challengeDeckId}
          onClose={() => setChallengeDeckId(null)}
          onCreated={loadDecks}
        />
      ) : null}
    </section>
  );
}

function DeckListSkeleton() {
  return (
    <div className="deck-list-skeleton" role="status">
      <span className="sr-only">덱을 불러오는 중입니다.</span>
      {[0, 1].map((item) => (
        <div
          className="deck-list-skeleton__item"
          key={item}
          aria-hidden="true"
        >
          <span className="deck-list-skeleton__title" />
          <span className="deck-list-skeleton__meta" />
        </div>
      ))}
    </div>
  );
}
