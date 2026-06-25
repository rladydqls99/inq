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
