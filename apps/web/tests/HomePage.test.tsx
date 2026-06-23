// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../src/features/challenges/HomePage";

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows active challenges sorted by nearest due date", async () => {
    mockFetch([
      challenge({
        id: "later",
        name: "나중",
        nextDueAt: "2026-06-30T00:00:00.000Z",
      }),
      challenge({
        id: "soon",
        name: "먼저",
        nextDueAt: "2026-06-24T00:00:00.000Z",
      }),
    ]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const items = await screen.findAllByRole("link");
    expect(items.map((item) => within(item).getByRole("heading").textContent)).toEqual([
      "먼저",
      "나중",
    ]);
    expect(items[0]?.getAttribute("href")).toBe("/challenges/soon/run");
  });

  it("shows empty state when there are no challenges", async () => {
    mockFetch([]);

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No challenges")).toBeTruthy();
  });
});

function mockFetch(response: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

function challenge(input: {
  id: string;
  name: string;
  nextDueAt: string | null;
}) {
  return {
    id: input.id,
    name: input.name,
    deckId: "deck",
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
    nextDueAt: input.nextDueAt,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}
