import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { ChallengeResponse, DeckResponse } from "@inq/shared";
import { apiRequest } from "../../api/client";
import { ActionListItem } from "../../components/ActionListItem";
import { PageHeader } from "../../components/PageHeader";
import { DeckCreateModal } from "../decks/DeckCreateModal";
import { ChallengeListItem } from "./ChallengeListItem";

export function HomePage() {
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [decks, setDecks] = useState<DeckResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deckCreateOpen, setDeckCreateOpen] = useState(false);

  async function loadHome() {
    setLoading(true);
    setLoadError(false);

    try {
      const [challengeResponse, deckResponse] = await Promise.all([
        apiRequest<ChallengeResponse[]>("/challenges"),
        apiRequest<DeckResponse[]>("/decks"),
      ]);
      setChallenges(
        challengeResponse.filter((challenge) => challenge.status === "active"),
      );
      setDecks(deckResponse);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHome();
  }, []);

  const sortedChallenges = useMemo(
    () => [...challenges].sort(compareByNextDueAt),
    [challenges],
  );
  const hasDueCards = sortedChallenges.some((challenge) => challenge.dueCount > 0);

  return (
    <section className="page">
      <PageHeader title="홈" />
      {loading ? <div className="list-empty">불러오는 중입니다.</div> : null}
      {loadError ? <div className="list-empty">홈 정보를 불러오지 못했습니다.</div> : null}
      <section className="home-section">
        <div className="section-heading">
          <h2>챌린지</h2>
          <Link to="/challenges">전체 보기</Link>
        </div>
        {!loading && !loadError && sortedChallenges.length === 0 ? (
          <div className="list-empty">등록된 챌린지가 없습니다.</div>
        ) : null}
        {!loading && !loadError && sortedChallenges.length > 0 && !hasDueCards ? (
          <div className="list-empty">지금 학습할 카드가 없습니다.</div>
        ) : null}
        <div className="action-list">
          {sortedChallenges.map((challenge) => (
            <ChallengeListItem key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <h2>덱</h2>
          <Link to="/decks">전체 보기</Link>
        </div>
        {!loading && !loadError && decks.length === 0 ? (
          <div className="empty-action">
            <p>등록된 덱이 없습니다.</p>
            <button type="button" onClick={() => setDeckCreateOpen(true)}>
              덱 생성하기
            </button>
          </div>
        ) : null}
        <div className="action-list">
          {decks.map((deck) => (
            <ActionListItem
              key={deck.id}
              to={`/decks/${deck.id}/manage`}
              title={deck.title}
              meta={`${deck.cardCount}장`}
            />
          ))}
        </div>
      </section>
      {deckCreateOpen ? (
        <DeckCreateModal
          onClose={() => setDeckCreateOpen(false)}
          onCreated={async () => {
            await loadHome();
          }}
        />
      ) : null}
    </section>
  );
}

function compareByNextDueAt(left: ChallengeResponse, right: ChallengeResponse) {
  const leftDueNow = left.dueCount > 0;
  const rightDueNow = right.dueCount > 0;

  if (leftDueNow !== rightDueNow) {
    return leftDueNow ? -1 : 1;
  }

  const leftTime = left.nextDueAt
    ? Date.parse(left.nextDueAt)
    : Number.POSITIVE_INFINITY;
  const rightTime = right.nextDueAt
    ? Date.parse(right.nextDueAt)
    : Number.POSITIVE_INFINITY;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return left.createdAt.localeCompare(right.createdAt);
}
