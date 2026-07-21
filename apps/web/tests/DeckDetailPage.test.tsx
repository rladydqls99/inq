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

    expect(
      await findByTextContent("훈민정음을 만든 조선의 왕은 세종대왕이다."),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "국어" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "학습 시작" })).toBeTruthy();
    expect(screen.getByText("조선").className).toContain("is-study");
    expect(screen.getByRole("link", { name: "카드 수정" }).getAttribute("href")).toBe(
      "/cards/card-1/edit",
    );
  });

  it("restarts a completed deck run before opening the study screen", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
      "/api/decks/deck-1/run": deckRun({
        cursor: 1,
        completedAt: "2026-07-21T00:00:00.000Z",
      }),
      "/api/decks/deck-1/run/restart": {
        deckId: "deck-1",
        cursor: 0,
        completedAt: null,
        cards: [],
      },
    });

    renderDeckDetail();

    await user.click(await screen.findByRole("button", { name: "학습 시작" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1/run/restart",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText("덱 학습 화면")).toBeTruthy();
  });

  it("resumes an unfinished deck run without resetting its cursor", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
      "/api/decks/deck-1/run": deckRun({ cursor: 1, completedAt: null }),
    });

    renderDeckDetail();

    await user.click(await screen.findByRole("button", { name: "학습 시작" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1/run",
      expect.any(Object),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/decks/deck-1/run/restart",
      expect.any(Object),
    );
    expect(await screen.findByText("덱 학습 화면")).toBeTruthy();
  });

  it("shows an error when loading cards fails", async () => {
    mockFetchByPath({
      "/api/decks/deck-1/cards": {
        body: { error: "card_list_failed" },
        status: 500,
      },
    });

    renderDeckDetail();

    expect(await screen.findByText("카드 목록을 불러오지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("불러오는 중입니다.")).toBeNull();
  });

  it("deletes a card from the deck detail list", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
    });

    renderDeckDetail();

    const listItem = await findByTextContent("훈민정음을 만든 왕은 세종대왕이다.");
    const cardItem = listItem.closest("article");

    expect(cardItem).not.toBeNull();
    await user.click(
      within(cardItem as HTMLElement).getByRole("button", { name: "카드 삭제" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(queryByTextContent("훈민정음을 만든 왕은 세종대왕이다.")).toBeNull();
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

    const listItem = await findByTextContent("훈민정음을 만든 왕은 세종대왕이다.");
    const cardItem = listItem.closest("article");

    expect(cardItem).not.toBeNull();
    await user.click(
      within(cardItem as HTMLElement).getByRole("button", { name: "카드 삭제" }),
    );

    expect(await screen.findByText("카드를 삭제하지 못했습니다.")).toBeTruthy();
    expect(queryByTextContent("훈민정음을 만든 왕은 세종대왕이다.")).toBeTruthy();
  });
});

function renderDeckDetail() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/manage"]}>
      <Routes>
        <Route path="/decks/:deckId/manage" element={<DeckDetailPage />} />
        <Route path="/decks/:deckId/run" element={<div>덱 학습 화면</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

type MockResponse = unknown | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const response =
      responsesByPath[path] ??
      (path === "/api/decks"
        ? [
            {
              id: "deck-1",
              title: "국어",
              cardCount: 1,
              createdAt: "2026-06-22T00:00:00.000Z",
              updatedAt: "2026-06-22T00:00:00.000Z",
            },
          ]
        : {});

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

function deckRun(input: { cursor: number; completedAt: string | null }) {
  return {
    deckId: "deck-1",
    cursor: input.cursor,
    completedAt: input.completedAt,
    cards: [
      { cardId: "card-1", segments: defaultSegments() },
      { cardId: "card-2", segments: defaultSegments() },
    ],
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

function findByTextContent(text: string) {
  return screen.findByText((_, element) => matchesTextContent(element, text));
}

function queryByTextContent(text: string) {
  return screen.queryByText((_, element) => matchesTextContent(element, text));
}

function matchesTextContent(element: Element | null, text: string) {
  if (element?.textContent !== text) {
    return false;
  }

  return Array.from(element.children).every((child) => child.textContent !== text);
}
