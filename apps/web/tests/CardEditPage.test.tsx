// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CardEditPage } from "../src/pages/decks/CardEditPage";

describe("CardEditPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads a card into a bracketed quiz textarea", async () => {
    mockFetchByPath({
      "/api/cards/card-1": card(),
    });

    renderCardEdit();

    expect(
      (await screen.findByLabelText("퀴즈 내용")) as HTMLTextAreaElement,
    ).toHaveProperty("value", "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.");
    expect(
      screen.getByText(/정답으로 만들 단어를 대괄호로 감싸세요/),
    ).toBeTruthy();
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
    expect(screen.queryByText("카드를 찾을 수 없습니다.")).toBeNull();
  });

  it("validates the changed quiz text before saving the complete card", async () => {
    const user = userEvent.setup();
    const markdown = "[훈민정음]을 만든 조선의 왕은 [세종대왕]이다.";
    const fetchMock = mockFetchByPath({
      "/api/cards/card-1": card(),
      "/api/import/markdown/preview": preview(),
    });

    renderCardEdit();

    const quizInput = await screen.findByLabelText("퀴즈 내용");
    fireEvent.change(quizInput, { target: { value: markdown } });
    expect(screen.getByRole("button", { name: "퀴즈로 저장" })).toHaveProperty(
      "disabled",
      true,
    );

    await user.click(screen.getByRole("button", { name: "검증하기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/markdown/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ markdown }),
      }),
    );
    expect(await screen.findByText("1장 검증 완료")).toBeTruthy();
    expect(screen.getByLabelText("검증된 퀴즈 미리보기").textContent).toContain(
      "훈민정음을 만든 조선의 왕은 세종대왕이다.",
    );

    await user.click(screen.getByRole("button", { name: "퀴즈로 저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cards/card-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ markdown, version: 1 }),
      }),
    );
    expect(await screen.findByText("저장되었습니다.")).toBeTruthy();
  });

  it("requires validation again after the quiz text changes", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/cards/card-1": card(),
      "/api/import/markdown/preview": preview(),
    });

    renderCardEdit();

    await user.click(await screen.findByRole("button", { name: "검증하기" }));
    expect(await screen.findByText("1장 검증 완료")).toBeTruthy();
    expect(screen.getByRole("button", { name: "퀴즈로 저장" })).toHaveProperty(
      "disabled",
      false,
    );

    await user.type(screen.getByLabelText("퀴즈 내용"), "!");

    expect(screen.queryByText("1장 검증 완료")).toBeNull();
    expect(screen.getByRole("button", { name: "퀴즈로 저장" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows validation errors and prevents saving an invalid quiz", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/cards/card-1": card(),
      "/api/import/markdown/preview": invalidPreview(),
    });

    renderCardEdit();

    const quizInput = await screen.findByLabelText("퀴즈 내용");
    await user.clear(quizInput);
    await user.type(quizInput, "정답 괄호가 없다.");
    await user.click(screen.getByRole("button", { name: "검증하기" }));

    expect(
      await screen.findByText(
        "정답 구간이 없습니다. 정답은 대괄호로 감싸 주세요.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "퀴즈로 저장" })).toHaveProperty(
      "disabled",
      true,
    );
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
      "/api/import/markdown/preview": preview(),
    });

    renderCardEdit();

    await user.click(await screen.findByRole("button", { name: "검증하기" }));
    await screen.findByText("1장 검증 완료");
    fireEvent.click(screen.getByRole("button", { name: "퀴즈로 저장" }));

    expect(
      await screen.findByText("카드가 이미 변경되었습니다. 다시 열어 주세요."),
    ).toBeTruthy();
    expect(screen.queryByText("저장되었습니다.")).toBeNull();
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

function mockFetchByPath(
  responsesByPath: Record<string, MockResponse | MockResponse[]>,
) {
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

function preview() {
  return {
    parsed: 1,
    errors: [],
    previewCards: [
      {
        blockIndex: 0,
        segments: [
          { type: "answer", id: "answer-1", value: "훈민정음" },
          { type: "text", value: "을 만든 조선의 왕은 " },
          { type: "answer", id: "answer-2", value: "세종대왕" },
          { type: "text", value: "이다." },
        ],
      },
    ],
  };
}

function invalidPreview() {
  return {
    parsed: 0,
    errors: [
      {
        blockIndex: 0,
        line: 1,
        column: null,
        code: "missing_answer",
        message: "Quiz card must contain at least one answer segment.",
        snippet: "정답 괄호가 없다.",
      },
    ],
    previewCards: [],
  };
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
