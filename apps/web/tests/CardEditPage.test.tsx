// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("shows an error when loading a card fails", async () => {
    mockFetchByPath({
      "/api/cards/card-1": {
        body: { error: "card_not_found" },
        status: 404,
      },
    });

    renderCardEdit();

    expect(await screen.findByText("카드를 불러오지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("Card not found")).toBeNull();
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

  it("clears the saved state when editing after saving", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/cards/card-1": card(),
    });

    renderCardEdit();

    const answerInput = await screen.findByLabelText("Answer 1");
    await user.clear(answerInput);
    await user.type(answerInput, "대한민국");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved")).toBeTruthy();

    await user.type(screen.getByLabelText("Answer 1"), "!");

    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("disables save when an answer segment is blank", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/cards/card-1": card(),
    });

    renderCardEdit();

    const answerInput = await screen.findByLabelText("Answer 1");
    await user.clear(answerInput);

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toHaveProperty("disabled", true);

    await user.click(saveButton);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("shows a save error when the card version is stale", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/cards/card-1": [
        card(),
        { body: { error: "card_version_conflict" }, status: 409 },
      ],
    });

    renderCardEdit();

    const answerInput = await screen.findByLabelText("Answer 1");
    await user.clear(answerInput);
    await user.type(answerInput, "대한민국");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("카드가 이미 변경되었습니다. 다시 열어 주세요.")).toBeTruthy();
    expect(screen.queryByText("Saved")).toBeNull();
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

type MockResponse = unknown | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse | MockResponse[]>) {
  const queues = new Map(
    Object.entries(responsesByPath).map(([path, response]) => [
      path,
      Array.isArray(response) ? [...response] : [response],
    ]),
  );
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const queue = queues.get(path) ?? [{}];
    const response = queue.length > 1 ? queue.shift() : queue[0];
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

function isMockErrorResponse(response: MockResponse): response is { body: unknown; status: number } {
  return (
    Boolean(response) &&
    typeof response === "object" &&
    response !== null &&
    "body" in response &&
    "status" in response
  );
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
