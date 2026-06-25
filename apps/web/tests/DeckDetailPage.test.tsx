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
    expect(screen.getByDisplayValue("훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.")).toBeTruthy();
  });

  it("saves an edited card as quiz segments", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
      "/api/cards/card-1": card({
        id: "card-1",
        segments: [
          { type: "text", value: "훈민정음을 만든 왕은 " },
          { type: "answer", id: "answer-1", value: "세종" },
          { type: "text", value: "이다." },
        ],
        version: 2,
      }),
    });

    renderDeckDetail();

    const editor = await screen.findByLabelText("Quiz markdown");
    await user.clear(editor);
    await user.click(editor);
    await user.paste("훈민정음을 만든 왕은 [세종]이다.");
    await user.click(screen.getByRole("button", { name: "Save card" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          segments: [
            { type: "text", value: "훈민정음을 만든 왕은 " },
            { type: "answer", id: "answer-1", value: "세종" },
            { type: "text", value: "이다." },
          ],
          version: 1,
        }),
      }),
    );
    expect(await screen.findByText("Saved")).toBeTruthy();
  });

  it("shows validation errors before saving invalid markdown", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks/deck-1/cards": [card({ id: "card-1" })],
    });

    renderDeckDetail();

    const editor = await screen.findByLabelText("Quiz markdown");
    await user.clear(editor);
    await user.click(editor);
    await user.paste("괄호 없는 문제");
    await user.click(screen.getByRole("button", { name: "Save card" }));

    expect(await screen.findByText(/must contain at least one answer/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({ method: "PATCH" }),
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
