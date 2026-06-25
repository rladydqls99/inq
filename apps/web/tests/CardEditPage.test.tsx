// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardEditPage } from "../src/features/decks/CardEditPage";

describe("CardEditPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads a card and renders editable segment values with previews", async () => {
    mockFetchByPath({
      "/api/cards/card-1": card(),
    });

    renderCardEdit();

    expect(((await screen.findByLabelText("Text 1")) as HTMLTextAreaElement).value).toBe(
      "훈민정음을 만든 ",
    );
    expect((screen.getByLabelText("Answer 1") as HTMLTextAreaElement).value).toBe(
      "조선",
    );
    expect((screen.getByLabelText("Answer 2") as HTMLTextAreaElement).value).toBe(
      "세종대왕",
    );
    expect(screen.getByText(matchesTextContent("훈민정음을 만든 ____의 왕은 ____이다."))).toBeTruthy();
    expect(screen.getByText(matchesTextContent("훈민정음을 만든 조선의 왕은 세종대왕이다."))).toBeTruthy();
  });

  it("saves changed segment values without changing segment structure", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/cards/card-1": card(),
    });

    renderCardEdit();

    const answerInput = await screen.findByLabelText("Answer 1");
    await user.clear(answerInput);
    await user.type(answerInput, "대한민국");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          segments: [
            { type: "text", value: "훈민정음을 만든 " },
            { type: "answer", id: "answer-1", value: "대한민국" },
            { type: "text", value: "의 왕은 " },
            { type: "answer", id: "answer-2", value: "세종대왕" },
            { type: "text", value: "이다." },
          ],
          version: 1,
        }),
      }),
    );
    expect(await screen.findByText("Saved")).toBeTruthy();
  });
});

function renderCardEdit() {
  render(
    <MemoryRouter initialEntries={["/cards/card-1/edit"]}>
      <Routes>
        <Route path="/cards/:cardId/edit" element={<CardEditPage />} />
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

function card() {
  return {
    id: "card-1",
    deckId: "deck-1",
    segments: [
      { type: "text", value: "훈민정음을 만든 " },
      { type: "answer", id: "answer-1", value: "조선" },
      { type: "text", value: "의 왕은 " },
      { type: "answer", id: "answer-2", value: "세종대왕" },
      { type: "text", value: "이다." },
    ],
    studyViewCount: 0,
    lastStudiedAt: null,
    version: 1,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

function matchesTextContent(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === expected &&
    Array.from(element.children).every((child) => child.textContent !== expected);
}
