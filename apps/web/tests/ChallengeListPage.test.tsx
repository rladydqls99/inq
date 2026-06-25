// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChallengeListPage } from "../src/features/challenges/ChallengeListPage";

describe("ChallengeListPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders challenge rows that link to the runner", async () => {
    mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const row = await screen.findByRole("link", { name: /중간고사/ });
    expect(row.getAttribute("href")).toBe("/challenges/challenge-1/run");
  });

  it("creates a challenge with default intervals", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [],
      "/api/decks": [{ id: "deck-1", title: "국어", cardCount: 3 }],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Challenge name"), "새 챌린지");
    await user.selectOptions(screen.getByLabelText("Deck"), "deck-1");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "새 챌린지",
          deckId: "deck-1",
          reviewIntervalsDays: [3, 5, 10],
        }),
      }),
    );
  });

  it("keeps delete and update-from-deck as row actions", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
      "/api/challenges/challenge-1/update-from-deck": { addedCount: 2 },
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(within(listItem).getByRole("button", { name: "Update from deck" }));
    expect(await screen.findByText("2 cards added")).toBeTruthy();

    await user.click(within(listItem).getByRole("button", { name: "Delete" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

function mockFetchByPath(responsesByPath: Record<string, unknown>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? {};

    return Promise.resolve(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function challenge(input: { id: string; name: string }) {
  return {
    id: input.id,
    name: input.name,
    deckId: "deck-1",
    deckTitle: "국어",
    status: "active",
    answerMode: "manual",
    reviewIntervalsDays: [3, 5, 10],
    maxStage: 3,
    dueCount: 1,
    progress: {
      totalCards: 10,
      completedCards: 2,
      dueCards: 1,
      currentStageCounts: { 0: 8 },
    },
    nextDueAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}
