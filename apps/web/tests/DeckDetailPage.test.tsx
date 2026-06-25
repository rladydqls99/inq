// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
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
