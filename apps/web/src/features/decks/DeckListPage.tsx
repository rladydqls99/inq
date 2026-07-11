import { useEffect, useState } from "react";

import type { DeckResponse } from "@inq/shared";
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

    try {
      await apiRequest(`/decks/${deckId}`, { method: "DELETE" });
      await loadDecks();
    } catch {
      setDeleteError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="덱" />
      {renameError ? <div className="list-empty">덱 이름을 저장하지 못했습니다.</div> : null}
      {deleteError ? <div className="list-empty">덱을 삭제하지 못했습니다.</div> : null}
      {loadError ? <div className="list-empty">덱 목록을 불러오지 못했습니다.</div> : null}
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {!loading && !loadError && decks.length === 0 ? (
        <div className="empty-action">
          <p>등록된 덱이 없습니다.</p>
          <button type="button" onClick={() => setCreateModalOpen(true)}>
            덱 등록하기
          </button>
        </div>
      ) : null}
      <div className="action-list">
        {decks.map((deck) => (
          <div key={deck.id} className="deck-row" data-testid={`deck-row-${deck.id}`}>
            <ActionListItem
              to={`/decks/${deck.id}/manage`}
              title={deck.title}
              meta={`${deck.cardCount}장`}
            />
            <ActionMenu
              label={`${deck.title} 메뉴`}
              open={openMenuDeckId === deck.id}
              onToggle={() =>
                setOpenMenuDeckId((current) => (current === deck.id ? null : deck.id))
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
      <button
        type="button"
        className="floating-add-button"
        aria-label="덱 만들기"
        onClick={() => setCreateModalOpen(true)}
      >
        +
      </button>
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
