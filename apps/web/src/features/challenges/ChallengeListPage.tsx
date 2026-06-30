import { useEffect, useState } from "react";

import type { ChallengeResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { ChallengeForm } from "./ChallengeForm";
import { ChallengeListItem } from "./ChallengeListItem";

export function ChallengeListPage() {
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [editingName, setEditingName] = useState("");
  const [renameError, setRenameError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  async function loadChallenges() {
    setChallenges(await apiRequest<ChallengeResponse[]>("/challenges"));
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
      setUpdateMessage(`${result.addedCount} cards added`);
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
      <PageHeader title="Challenges" />
      <ChallengeForm onCreated={loadChallenges} />
      {updateMessage ? <div className="list-empty">{updateMessage}</div> : null}
      {updateError ? <div className="list-empty">챌린지를 업데이트하지 못했습니다.</div> : null}
      {renameError ? <div className="list-empty">챌린지 이름을 저장하지 못했습니다.</div> : null}
      {deleteError ? <div className="list-empty">챌린지를 삭제하지 못했습니다.</div> : null}
      <div className="action-list">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-row"
            data-testid={`challenge-row-${challenge.id}`}
          >
            <ChallengeListItem challenge={challenge} />
            {editingChallengeId === challenge.id ? (
              <div className="inline-edit">
                <label>
                  Challenge name
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveChallengeName(challenge.id)}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingChallengeId(null)}
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <div className="row-actions" aria-label={`${challenge.name} actions`}>
              <button type="button" onClick={() => startEditing(challenge)}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => void updateFromDeck(challenge.id)}
              >
                Update from deck
              </button>
              <button
                type="button"
                onClick={() => void deleteChallenge(challenge.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
