import { useEffect, useState } from "react";

import type { ChallengeResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { ActionMenu } from "../../components/ActionMenu";
import { PageHeader } from "../../components/PageHeader";
import { ChallengeCreateModal } from "./ChallengeCreateModal";
import { ChallengeListItem } from "./ChallengeListItem";

export function ChallengeListPage() {
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [openMenuChallengeId, setOpenMenuChallengeId] = useState<string | null>(null);

  async function loadChallenges() {
    setLoadError(false);

    try {
      setChallenges(await apiRequest<ChallengeResponse[]>("/challenges"));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChallenges();
  }, []);

  async function deleteChallenge(challengeId: string) {
    setDeleteError(false);

    try {
      await apiRequest(`/challenges/${challengeId}`, { method: "DELETE" });
      await loadChallenges();
    } catch {
      setDeleteError(true);
    }
  }

  async function updateFromDeck(challengeId: string) {
    setUpdateError(false);

    try {
      const result = await apiRequest<{ addedCount: number }>(
        `/challenges/${challengeId}/update-from-deck`,
        { method: "POST" },
      );
      setUpdateMessage(`${result.addedCount}장의 카드가 추가되었습니다.`);
      await loadChallenges();
    } catch {
      setUpdateMessage(null);
      setUpdateError(true);
    }
  }

  function startEditing(challenge: ChallengeResponse) {
    setEditingChallengeId(challenge.id);
    setEditingName(challenge.name);
    setRenameError(false);
  }

  async function saveChallengeName(challengeId: string) {
    const name = editingName.trim();

    if (!name) {
      return;
    }

    setRenameError(false);

    try {
      await apiRequest(`/challenges/${challengeId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setEditingChallengeId(null);
      setEditingName("");
      await loadChallenges();
    } catch {
      setRenameError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="챌린지" />
      {loadError ? <div className="list-empty">챌린지 목록을 불러오지 못했습니다.</div> : null}
      {updateMessage ? <div className="list-empty">{updateMessage}</div> : null}
      {updateError ? <div className="list-empty">챌린지를 업데이트하지 못했습니다.</div> : null}
      {renameError ? <div className="list-empty">챌린지 이름을 저장하지 못했습니다.</div> : null}
      {deleteError ? <div className="list-empty">챌린지를 삭제하지 못했습니다.</div> : null}
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {!loading && !loadError && challenges.length === 0 ? (
        <div className="empty-action">
          <p>등록된 챌린지가 없습니다.</p>
          <button type="button" onClick={() => setCreateModalOpen(true)}>
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
      <button
        type="button"
        className="floating-add-button"
        aria-label="챌린지 등록"
        onClick={() => setCreateModalOpen(true)}
      >
        +
      </button>
      {createModalOpen ? (
        <ChallengeCreateModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={loadChallenges}
        />
      ) : null}
    </section>
  );
}
