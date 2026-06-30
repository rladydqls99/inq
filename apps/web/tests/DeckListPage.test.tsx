// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeckListPage } from "../src/features/decks/DeckListPage";

describe("DeckListPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders deck rows that link to the deck runner", async () => {
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 7 })],
    });

    render(
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>,
    );

    const row = await screen.findByRole("link", { name: /국어/ });
    expect(row.getAttribute("href")).toBe("/decks/deck-1/run");
    expect(row.textContent).toContain("7 cards");
  });

  it("creates a deck and reloads the list", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [],
    });

    render(
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Deck name"), "영어");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "영어" }),
      }),
    );
  });

  it("shows an error and keeps the title when creating a deck fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks": {
        body: { error: "invalid_deck_title" },
        status: 400,
      },
    });

    render(
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>,
    );

    const titleInput = await screen.findByLabelText("Deck name");
    await user.type(titleInput, "영어");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("덱을 생성하지 못했습니다.")).toBeTruthy();
    expect(titleInput).toHaveProperty("value", "영어");
  });

  it("keeps manage, rename, and delete as row actions", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 2 })],
      "/api/decks/deck-1": deck({ id: "deck-1", title: "국어 수정", cardCount: 2 }),
    });

    render(
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("deck-row-deck-1");
    expect(within(listItem).getByRole("link", { name: "Manage cards" }).getAttribute("href")).toBe(
      "/decks/deck-1/manage",
    );

    await user.click(within(listItem).getByRole("button", { name: "Rename" }));
    const titleInput = within(listItem).getByLabelText("Deck name");
    await user.clear(titleInput);
    await user.type(titleInput, "국어 수정");
    await user.click(within(listItem).getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ title: "국어 수정" }),
      }),
    );

    await user.click(within(listItem).getByRole("button", { name: "Delete" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decks/deck-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows an error and keeps the row when deleting a deck fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 2 })],
      "/api/decks/deck-1": {
        body: { error: "deck_not_found" },
        status: 404,
      },
    });

    render(
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("deck-row-deck-1");
    await user.click(within(listItem).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("덱을 삭제하지 못했습니다.")).toBeTruthy();
    expect(screen.getByTestId("deck-row-deck-1")).toBeTruthy();
  });

  it("shows an error and keeps editing when renaming a deck fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/decks": [deck({ id: "deck-1", title: "국어", cardCount: 2 })],
      "/api/decks/deck-1": {
        body: { error: "deck_not_found" },
        status: 404,
      },
    });

    render(
      <MemoryRouter>
        <DeckListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("deck-row-deck-1");
    await user.click(within(listItem).getByRole("button", { name: "Rename" }));
    const titleInput = within(listItem).getByLabelText("Deck name");
    await user.clear(titleInput);
    await user.type(titleInput, "국어 수정");
    await user.click(within(listItem).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("덱 이름을 저장하지 못했습니다.")).toBeTruthy();
    expect(within(listItem).getByLabelText("Deck name")).toHaveProperty(
      "value",
      "국어 수정",
    );
  });
});

type MockResponse = unknown | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? {};
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

function deck(input: { id: string; title: string; cardCount: number }) {
  return {
    id: input.id,
    title: input.title,
    cardCount: input.cardCount,
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
