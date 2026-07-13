// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckListPage } from "../src/features/decks/DeckListPage";

describe("DeckListPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders deck cards that open the card list", async () => {
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 7 })],
    });

    renderDeckListPage();

    const row = await screen.findByRole("link", { name: /국어/ });
    expect(row.getAttribute("href")).toBe("/decks/deck-1/manage");
    expect(row.textContent).toContain("7장");
  });

  it("shows empty state and creates a deck from the modal", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({ "/api/decks": [] });

    renderDeckListPage();

    expect(await screen.findByText("등록된 덱이 없습니다.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "덱 등록하기" }));
    await user.type(await screen.findByLabelText("덱 이름"), "영어");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "영어" }),
      }),
    );
  });

  it("uses the row menu for rename, challenge creation, and delete", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 2 })],
      "/api/decks/deck-1": deck({ id: "deck-1", title: "국어 수정", cardCount: 2 }),
      "/api/challenges": { id: "challenge-1" },
    });

    renderDeckListPage();

    const listItem = await screen.findByTestId("deck-row-deck-1");
    await user.click(within(listItem).getByRole("button", { name: "국어 메뉴" }));
    await user.click(within(listItem).getByRole("button", { name: "이름 변경" }));
    const titleInput = within(listItem).getByLabelText("덱 이름");
    await user.clear(titleInput);
    await user.type(titleInput, "국어 수정");
    await user.click(within(listItem).getByRole("button", { name: "저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "국어 수정" }),
      }),
    );

    await user.click(
      within(listItem).getByRole("button", { name: "국어 메뉴" }),
    );
    await user.click(within(listItem).getByRole("button", { name: "챌린지 등록" }));
    await user.type(await screen.findByLabelText("챌린지 이름"), "중간고사");
    await user.click(screen.getByRole("button", { name: "등록하기" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "중간고사",
          deckId: "deck-1",
          reviewIntervalsDays: [3, 5, 10],
        }),
      }),
    );

    await user.click(within(listItem).getByRole("button", { name: "국어 메뉴" }));
    await user.click(within(listItem).getByRole("button", { name: "삭제" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows an error when loading decks fails", async () => {
    mockFetchByPath({
      "/api/decks": { body: { error: "deck_list_failed" }, status: 500 },
    });

    renderDeckListPage();

    expect(await screen.findByText("덱 목록을 불러오지 못했습니다.")).toBeTruthy();
  });
});

function renderDeckListPage() {
  render(
    <MemoryRouter>
      <DeckListPage />
    </MemoryRouter>,
  );
}

type MockResponse =
  | unknown
  | ((input: RequestInfo | URL, init?: RequestInit) => unknown)
  | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const rawResponse = responsesByPath[path] ?? {};

    if (path === "/api/decks" && init?.method === "POST") {
      return Promise.resolve(jsonResponse(deck({ id: "created-deck", title: "영어", cardCount: 0 })));
    }

    const response =
      typeof rawResponse === "function" ? rawResponse(input, init) : rawResponse;
    const status = isMockErrorResponse(response) ? response.status : 200;
    const body = isMockErrorResponse(response) ? response.body : response;

    return Promise.resolve(jsonResponse(body, status));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(response: unknown, status = 200) {
  return new Response(JSON.stringify(response), {
    status,
    headers: { "content-type": "application/json" },
  });
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
