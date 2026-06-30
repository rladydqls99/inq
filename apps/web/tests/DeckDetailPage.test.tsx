// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckDetailPage } from "../src/features/decks/DeckDetailPage";

describe("DeckDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lists cards for the selected deck", async () => {
    mockFetchByPath({
      "/api/decks/deck-1/cards": [
        card({
          id: "card-1",
          segments: [
            { type: "text", value: "훈민정음을 만든 " },
            { type: "answer", id: "answer-1", value: "조선" },
            { type: "text", value: "의 왕은 " },
            { type: "answer", id: "answer-2", value: "세종대왕" },
            { type: "text", value: "이다." },
          ],
        }),
      ],
    });

    renderDeckDetail();

    expect(await screen.findByText("훈민정음을 만든 조선의 왕은 세종대왕이다.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Edit card" }).getAttribute("href")).toBe(
      "/cards/card-1/edit",
    );
  });

  it("deletes a card from the deck detail list", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
    });

    renderDeckDetail();

    const listItem = await screen.findByText("훈민정음을 만든 왕은 세종대왕이다.");
    const cardItem = listItem.closest("article");

    expect(cardItem).not.toBeNull();
    await user.click(
      within(cardItem as HTMLElement).getByRole("button", { name: "Delete card" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.queryByText("훈민정음을 만든 왕은 세종대왕이다.")).toBeNull();
  });

  it("shows an error and keeps the card when deleting a card fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
      "/api/cards/card-1": {
        body: { error: "card_not_found" },
        status: 404,
      },
    });

    renderDeckDetail();

    const listItem = await screen.findByText("훈민정음을 만든 왕은 세종대왕이다.");
    const cardItem = listItem.closest("article");

    expect(cardItem).not.toBeNull();
    await user.click(
      within(cardItem as HTMLElement).getByRole("button", { name: "Delete card" }),
    );

    expect(await screen.findByText("카드를 삭제하지 못했습니다.")).toBeTruthy();
    expect(screen.getByText("훈민정음을 만든 왕은 세종대왕이다.")).toBeTruthy();
  });
});

function renderDeckDetail() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/manage"]}>
      <Routes>
        <Route path="/decks/:deckId/manage" element={<DeckDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

type MockResponse = unknown | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? {};

    if (
      path === "/api/cards/card-1" &&
      init?.method === "DELETE" &&
      !isMockErrorResponse(response)
    ) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }

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
  return fetchMock;
}

function card(input: {
  id: string;
  segments?: ReturnType<typeof defaultSegments>;
  version?: number;
}) {
  return {
    id: input.id,
    deckId: "deck-1",
    segments: input.segments ?? defaultSegments(),
    studyViewCount: 0,
    lastStudiedAt: null,
    version: input.version ?? 1,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

function defaultSegments() {
  return [
    { type: "text" as const, value: "훈민정음을 만든 왕은 " },
    { type: "answer" as const, id: "answer-1", value: "세종대왕" },
    { type: "text" as const, value: "이다." },
  ];
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
