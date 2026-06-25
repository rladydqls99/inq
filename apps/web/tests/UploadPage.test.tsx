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

  it("renders the desktop upload shell with deck selection and preview column", async () => {
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
    });

    renderUploadPage();

    expect(await screen.findByRole("heading", { name: "Upload" })).toBeTruthy();
    expect(screen.getByLabelText("Deck")).toBeTruthy();
    expect(screen.getByRole("option", { name: "국어" })).toBeTruthy();
    expect(screen.getByTestId("upload-source-pane")).toBeTruthy();
    expect(screen.getByTestId("upload-preview-pane")).toBeTruthy();
  });

  it("creates a deck inline and selects it", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [],
    });

    renderUploadPage();

    await user.type(await screen.findByLabelText("New deck name"), "한국사");
    await user.click(screen.getByRole("button", { name: "Create deck" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "한국사" }),
      }),
    );
    expect(await screen.findByRole("option", { name: "한국사" })).toBeTruthy();
    expect(screen.getByLabelText("Deck")).toHaveProperty("value", "created-deck");
  });

  it("reads markdown from a selected file into the source pane", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
    });
    const file = new File(["훈민정음을 만든 [세종대왕]이다."], "quiz.md", {
      type: "text/markdown",
    });

    renderUploadPage();

    const sourcePane = await screen.findByTestId("upload-source-pane");
    await user.upload(within(sourcePane).getByLabelText("Markdown file"), file);

    expect(screen.getByLabelText("Markdown source")).toHaveProperty(
      "value",
      "훈민정음을 만든 [세종대왕]이다.",
    );
  });

  it("validates markdown and renders preview cards", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
      "/api/imports/markdown/preview": {
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
    });

    renderUploadPage();

    const source = await screen.findByLabelText("Markdown source");
    await user.click(source);
    await user.paste("훈민정음을 만든 [세종대왕]이다.");
    await user.click(screen.getByRole("button", { name: "Validate" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/imports/markdown/preview",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ markdown: "훈민정음을 만든 [세종대왕]이다." }),
      }),
    );
    expect(await screen.findByText("1 parsed")).toBeTruthy();
    expect(screen.getByText(matchesTextContent("훈민정음을 만든 ____이다."))).toBeTruthy();
    expect(screen.getByText(matchesTextContent("훈민정음을 만든 세종대왕이다."))).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Create cards" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("renders validation errors and disables card creation", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
      "/api/imports/markdown/preview": {
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

    const source = await screen.findByLabelText("Markdown source");
    await user.type(source, "정답 괄호가 없다.");
    await user.click(screen.getByRole("button", { name: "Validate" }));

    expect(await screen.findByText("missing_answer")).toBeTruthy();
    expect(screen.getByText("Quiz card must contain at least one answer segment.")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Create cards" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("confirms import with the original markdown and clears source state", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어" })],
      "/api/imports/markdown/preview": {
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
      "/api/imports/markdown/confirm": { createdCount: 1 },
    });

    renderUploadPage();

    const source = await screen.findByLabelText("Markdown source");
    await user.click(source);
    await user.paste("훈민정음을 만든 [세종대왕]이다.");
    await user.click(screen.getByRole("button", { name: "Validate" }));
    await user.click(await screen.findByRole("button", { name: "Create cards" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/imports/markdown/confirm",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          deckId: "deck-1",
          markdown: "훈민정음을 만든 [세종대왕]이다.",
        }),
      }),
    );
    expect(await screen.findByText("1 cards created")).toBeTruthy();
    expect(screen.getByLabelText("Markdown source")).toHaveProperty("value", "");
    expect(screen.queryByText("1 parsed")).toBeNull();
  });
});

function renderUploadPage() {
  render(
    <MemoryRouter>
      <UploadPage />
    </MemoryRouter>,
  );
}

function mockFetchByPath(responsesByPath: Record<string, unknown>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();

    if (path === "/api/decks" && init?.method === "POST") {
      return Promise.resolve(jsonResponse(deck({ id: "created-deck", title: "한국사" })));
    }

    return Promise.resolve(jsonResponse(responsesByPath[path] ?? {}));
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

function deck(input: { id: string; title: string }) {
  return {
    id: input.id,
    title: input.title,
    cardCount: 0,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z",
  };
}

function matchesTextContent(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === expected &&
    Array.from(element.children).every((child) => child.textContent !== expected);
}
