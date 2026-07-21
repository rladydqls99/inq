// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckRunnerPage } from "../src/features/runners/DeckRunnerPage";

describe("DeckRunnerPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads a deck run with inline answers already revealed", async () => {
    mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 0 }),
    });

    renderDeckRunner();

    expect(
      await screen.findByText(matchesTextContent("훈민정음을 만든 세종대왕이다.")),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "정답 보기" })).toBeNull();
    expect(screen.getByRole("button", { name: "다음 카드로 이동" })).toBeTruthy();
    expect(screen.queryByText("5초")).toBeNull();
  });

  it("shows an error when loading a deck run fails", async () => {
    mockFetchByPath({
      "/api/decks/deck-1/run": {
        body: { error: "deck_not_found" },
        status: 404,
      },
    });

    renderDeckRunner();

    expect(await screen.findByText("덱 실행 정보를 불러오지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("불러오는 중입니다.")).toBeNull();
  });

  it("persists the cursor when moving to the next card", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 0 }),
    });

    renderDeckRunner();

    await screen.findByText(matchesTextContent("훈민정음을 만든 세종대왕이다."));
    await user.click(screen.getByRole("button", { name: "다음 카드" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
      }),
    );
    expect(await screen.findByText(matchesTextContent("수도는 서울이다."))).toBeTruthy();
  });

  it("shows an error and keeps the current card when moving fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks/deck-1/run": (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === "PATCH"
          ? { body: { error: "move_failed" }, status: 500 }
          : deckRun({ cursor: 0 }),
    });

    renderDeckRunner();

    await screen.findByText(matchesTextContent("훈민정음을 만든 세종대왕이다."));
    await user.click(screen.getByRole("button", { name: "다음 카드" }));

    expect(await screen.findByText("카드를 이동하지 못했습니다.")).toBeTruthy();
    expect(
      screen.getByText(matchesTextContent("훈민정음을 만든 세종대왕이다.")),
    ).toBeTruthy();
  });

  it("returns to the deck list when loading a completed run", async () => {
    mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 2, completedAt: "2026-06-25T00:00:00.000Z" }),
    });

    renderDeckRunner();

    expect(await screen.findByText("덱 목록")).toBeTruthy();
    expect(screen.queryByText("완료되었습니다.")).toBeNull();
  });

  it("returns to the deck list after advancing past the final card", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 1 }),
    });

    renderDeckRunner();

    await screen.findByText(matchesTextContent("수도는 서울이다."));
    await user.click(screen.getByRole("button", { name: "다음 카드" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 2 }),
      }),
    );
    expect(await screen.findByText("덱 목록")).toBeTruthy();
  });
});

function renderDeckRunner() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/run"]}>
      <Routes>
        <Route path="/decks/:deckId/run" element={<DeckRunnerPage />} />
        <Route path="/decks" element={<div>덱 목록</div>} />
      </Routes>
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
    const rawResponse =
      responsesByPath[path] ?? responsesByPath["/api/decks/deck-1/run"] ?? {};
    const response =
      typeof rawResponse === "function"
        ? rawResponse(input, init)
        : rawResponse;

    if (
      path === "/api/decks/deck-1/run" &&
      init?.method === "PATCH" &&
      !isMockErrorResponse(response)
    ) {
      const body = JSON.parse(init.body as string) as { cursor: number };
      return Promise.resolve(jsonResponse(deckRun({ cursor: body.cursor })));
    }

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

function deckRun(input: { cursor: number; completedAt?: string | null }) {
  return {
    deckId: "deck-1",
    cursor: input.cursor,
    completedAt: input.completedAt ?? null,
    cards: [
      {
        cardId: "card-1",
        segments: [
          { type: "text", value: "훈민정음을 만든 " },
          { type: "answer", id: "answer-1", value: "세종대왕" },
          { type: "text", value: "이다." },
        ],
      },
      {
        cardId: "card-2",
        segments: [
          { type: "text", value: "수도는 " },
          { type: "answer", id: "answer-1", value: "서울" },
          { type: "text", value: "이다." },
        ],
      },
    ],
  };
}

function matchesTextContent(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === expected &&
    Array.from(element.children).every((child) => child.textContent !== expected);
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
