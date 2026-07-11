// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../src/features/challenges/HomePage";

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows active challenges first and decks below", async () => {
    mockFetchByPath({
      "/api/challenges": [
        challenge({ id: "later", name: "나중", nextDueAt: "2026-06-30T00:00:00.000Z" }),
        challenge({ id: "soon", name: "먼저", nextDueAt: "2026-06-24T00:00:00.000Z" }),
      ],
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 3 })],
    });

    renderHomePage();

    expect(await screen.findByRole("link", { name: /먼저/ })).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: /국어/ })
        .some((link) => link.getAttribute("href") === "/decks/deck-1/manage"),
    ).toBe(true);
  });

  it("shows empty states and opens deck creation from home", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/challenges": [],
      "/api/decks": [],
    });

    renderHomePage();

    expect(await screen.findByText("등록된 챌린지가 없습니다.")).toBeTruthy();
    expect(screen.getByText("등록된 덱이 없습니다.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "덱 생성하기" }));
    expect(await screen.findByRole("dialog", { name: "덱 만들기" })).toBeTruthy();
  });

  it("shows an error when loading home data fails", async () => {
    mockFetchByPath({
      "/api/challenges": { body: { error: "failed" }, status: 500 },
      "/api/decks": [],
    });

    renderHomePage();

    expect(await screen.findByText("홈 정보를 불러오지 못했습니다.")).toBeTruthy();
  });
});

function renderHomePage() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

type MockResponse = unknown | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? {};
    const status = isMockErrorResponse(response) ? response.status : 200;
    const body = isMockErrorResponse(response) ? response.body : response;

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  vi.stubGlobal("fetch", fetchMock);
}

function challenge(input: {
  id: string;
  name: string;
  nextDueAt: string | null;
  dueCount?: number;
}) {
  const dueCount = input.dueCount ?? 1;

  return {
    id: input.id,
    name: input.name,
    deckId: "deck",
    deckTitle: "국어",
    status: "active",
    answerMode: "manual",
    reviewIntervalsDays: [3, 5, 10],
    maxStage: 3,
    dueCount,
    progress: {
      totalCards: 10,
      completedCards: 2,
      dueCards: dueCount,
      currentStageCounts: { 0: 8 },
    },
    nextDueAt: input.nextDueAt,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

function deck(input: { id: string; title: string; cardCount: number }) {
  return {
    id: input.id,
    title: input.title,
    cardCount: input.cardCount,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

function isMockErrorResponse(
  response: MockResponse,
): response is { body: unknown; status: number } {
  return (
    Boolean(response) &&
    typeof response === "object" &&
    response !== null &&
    "body" in response &&
    "status" in response
  );
}
