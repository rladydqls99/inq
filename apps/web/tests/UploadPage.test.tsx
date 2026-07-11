// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UploadPage } from "../src/features/upload/UploadPage";

describe("UploadPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders deck selection, source pane, and preview pane", async () => {
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
    });

    renderUploadPage();

    expect(await screen.findByRole("heading", { name: "업로드" })).toBeTruthy();
    expect(screen.getByLabelText("덱 선택")).toBeTruthy();
    expect(screen.getByTestId("upload-source-pane")).toBeTruthy();
    expect(screen.getByTestId("upload-preview-pane")).toBeTruthy();
  });

  it("creates a deck from the modal and selects it", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({ "/api/decks": [] });

    renderUploadPage();

    await user.click(await screen.findByRole("button", { name: "덱 만들기" }));
    await user.type(await screen.findByLabelText("덱 이름"), "한국사");
    await user.click(screen.getByRole("button", { name: "만들기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "한국사" }),
      }),
    );
    expect(await screen.findByRole("option", { name: "한국사" })).toBeTruthy();
    expect(screen.getByLabelText("덱 선택")).toHaveProperty("value", "created-deck");
  });

  it("validates markdown from the source pane and creates cards from the preview pane", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
      "/api/import/markdown/preview": {
        parsed: 1,
        errors: [],
        previewCards: [
          {
            blockIndex: 0,
            segments: [
              { type: "text", value: "훈민정음을 만든 " },
              { type: "answer", id: "answer-1", value: "세종대왕" },
              { type: "text", value: "이다." },
            ],
          },
        ],
      },
      "/api/import/markdown/confirm": { createdCount: 1 },
    });

    renderUploadPage();

    const sourcePane = await screen.findByTestId("upload-source-pane");
    const previewPane = screen.getByTestId("upload-preview-pane");
    await user.click(within(sourcePane).getByLabelText("마크다운 내용"));
    await user.paste("훈민정음을 만든 [세종대왕]이다.");
    await user.click(within(sourcePane).getByRole("button", { name: "검증하기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/markdown/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ markdown: "훈민정음을 만든 [세종대왕]이다." }),
      }),
    );
    expect(await within(previewPane).findByText("1장 검증 완료")).toBeTruthy();
    await user.click(within(previewPane).getByRole("button", { name: "카드 만들기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/markdown/confirm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          deckId: "deck-1",
          markdown: "훈민정음을 만든 [세종대왕]이다.",
        }),
      }),
    );
    expect(await screen.findByText("1장의 카드를 만들었습니다.")).toBeTruthy();
  });

  it("shows validation error locations under the markdown editor", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
      "/api/import/markdown/preview": {
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
      },
    });

    renderUploadPage();

    const sourcePane = await screen.findByTestId("upload-source-pane");
    await user.type(within(sourcePane).getByLabelText("마크다운 내용"), "정답 괄호가 없다.");
    await user.click(within(sourcePane).getByRole("button", { name: "검증하기" }));

    expect(await within(sourcePane).findByText("1행")).toBeTruthy();
    expect(
      within(sourcePane).getByText("정답 구간이 없습니다. 정답은 대괄호로 감싸 주세요."),
    ).toBeTruthy();
    expect((screen.getByRole("button", { name: "카드 만들기" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

function renderUploadPage() {
  render(
    <MemoryRouter>
      <UploadPage />
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
      return Promise.resolve(jsonResponse(deck({ id: "created-deck", title: "한국사" })));
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

function deck(input: { id: string; title: string }) {
  return {
    id: input.id,
    title: input.title,
    cardCount: 0,
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
