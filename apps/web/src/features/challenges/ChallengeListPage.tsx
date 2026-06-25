import { useEffect, useState } from "react";

import type { ChallengeResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { ChallengeForm } from "./ChallengeForm";
import { ChallengeListItem } from "./ChallengeListItem";

export function ChallengeListPage() {
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  async function loadChallenges() {
    setChallenges(await apiRequest<ChallengeResponse[]>("/challenges"));
  }

  useEffect(() => {
    void loadChallenges();
  }, []);

  async function deleteChallenge(challengeId: string) {
    await apiRequest(`/challenges/${challengeId}`, { method: "DELETE" });
    await loadChallenges();
  }

  async function updateFromDeck(challengeId: string) {
    const result = await apiRequest<{ addedCount: number }>(
      `/challenges/${challengeId}/update-from-deck`,
      { method: "POST" },
    );
    setUpdateMessage(`${result.addedCount} cards added`);
  }

  return (
    <section className="page">
      <PageHeader title="Challenges" />
      <ChallengeForm onCreated={loadChallenges} />
      {updateMessage ? <div className="list-empty">{updateMessage}</div> : null}
      <div className="action-list">
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="challenge-row"
            data-testid={`challenge-row-${challenge.id}`}
          >
            <ChallengeListItem challenge={challenge} />
            <div className="row-actions" aria-label={`${challenge.name} actions`}>
              <button type="button">Edit</button>
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
