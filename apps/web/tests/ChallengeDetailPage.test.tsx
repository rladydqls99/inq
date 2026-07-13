// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChallengeDetailPage } from "../src/features/challenges/ChallengeDetailPage";

describe("ChallengeDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the challenge name beside the study action and highlights answers", async () => {
    mockFetchByPath({
      "/api/challenges/challenge-1/cards": [challengeCard()],
      "/api/challenges": [challenge()],
    });

    renderChallengeDetail();

    expect(await screen.findByRole("heading", { name: "중간고사" })).toBeTruthy();
    expect(screen.getByText("챌린지 카드")).toBeTruthy();
    expect(screen.getByText("국어 덱 · 카드 1장")).toBeTruthy();
    expect(screen.getByRole("link", { name: "학습 시작" }).getAttribute("href")).toBe(
      "/challenges/challenge-1/run",
    );
    expect(screen.getByText("세종대왕").className).toContain("is-study");
  });
});

function renderChallengeDetail() {
  render(
    <MemoryRouter initialEntries={["/challenges/challenge-1/cards"]}>
      <Routes>
        <Route
          path="/challenges/:challengeId/cards"
          element={<ChallengeDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function mockFetchByPath(responsesByPath: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const path = typeof input === "string" ? input : input.toString();
      return Promise.resolve(
        new Response(JSON.stringify(responsesByPath[path] ?? {}), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    }),
  );
}

function challenge() {
  return {
    id: "challenge-1",
    name: "중간고사",
    deckId: "deck-1",
    deckTitle: "국어",
    status: "active",
    answerMode: "manual",
    reviewIntervalsDays: [3, 5, 10],
    maxStage: 3,
    dueCount: 1,
    progress: {
      totalCards: 1,
      completedCards: 0,
      dueCards: 1,
      currentStageCounts: { 0: 1 },
    },
    nextDueAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

function challengeCard() {
  return {
    id: "state-1",
    challengeId: "challenge-1",
    cardId: "card-1",
    segments: [
      { type: "text", value: "훈민정음을 만든 왕은 " },
      { type: "answer", id: "answer-1", value: "세종대왕" },
      { type: "text", value: "이다." },
    ],
    stage: 0,
    challengeViewCount: 0,
    dueAt: null,
    lastChallengedAt: null,
    result: null,
    completedAt: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}
