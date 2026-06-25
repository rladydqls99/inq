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

  it("loads a deck run and reveals inline answers on demand", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 0 }),
    });

    renderDeckRunner();

    expect(await screen.findByText(matchesTextContent("훈민정음을 만든 ____이다."))).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByText(matchesTextContent("훈민정음을 만든 세종대왕이다."))).toBeTruthy();
    expect(screen.getByText("10s")).toBeTruthy();
  });

  it("persists the cursor when moving to the next card", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 0 }),
    });

    renderDeckRunner();

    await screen.findByText(matchesTextContent("훈민정음을 만든 ____이다."));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
      }),
    );
    expect(await screen.findByText(matchesTextContent("수도는 ____이다."))).toBeTruthy();
  });

  it("shows completed state and restarts the deck run", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/run": deckRun({ cursor: 2, completedAt: "2026-06-25T00:00:00.000Z" }),
      "/api/decks/deck-1/run/restart": deckRun({ cursor: 0 }),
    });

    renderDeckRunner();

    expect(await screen.findByText("Completed")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Restart" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1/run/restart",
      expect.objectContaining({ method: "POST" }),
    );
    expect(await screen.findByText(matchesTextContent("훈민정음을 만든 ____이다."))).toBeTruthy();
  });
});

function renderDeckRunner() {
  render(
    <MemoryRouter initialEntries={["/decks/deck-1/run"]}>
      <Routes>
        <Route path="/decks/:deckId/run" element={<DeckRunnerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockFetchByPath(responsesByPath: Record<string, unknown>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? responsesByPath["/api/decks/deck-1/run"] ?? {};

    if (path === "/api/decks/deck-1/run" && init?.method === "PATCH") {
      const body = JSON.parse(init.body as string) as { cursor: number };
      return Promise.resolve(jsonResponse(deckRun({ cursor: body.cursor })));
    }

    return Promise.resolve(jsonResponse(response));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(response: unknown) {
  return new Response(JSON.stringify(response), {
    status: 200,
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
