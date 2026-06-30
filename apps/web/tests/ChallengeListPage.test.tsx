// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChallengeListPage } from "../src/features/challenges/ChallengeListPage";

describe("ChallengeListPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders challenge rows that link to the runner", async () => {
    mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const row = await screen.findByRole("link", { name: /중간고사/ });
    expect(row.getAttribute("href")).toBe("/challenges/challenge-1/run");
  });

  it("shows an error when loading challenges fails", async () => {
    mockFetchByPath({
      "/api/challenges": {
        body: { error: "challenge_list_failed" },
        status: 500,
      },
      "/api/decks": [],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("챌린지 목록을 불러오지 못했습니다.")).toBeTruthy();
  });

  it("creates a challenge with default intervals", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [],
      "/api/decks": [{ id: "deck-1", title: "국어", cardCount: 3 }],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Challenge name"), "새 챌린지");
    await user.selectOptions(screen.getByLabelText("Deck"), "deck-1");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "새 챌린지",
          deckId: "deck-1",
          reviewIntervalsDays: [3, 5, 10],
        }),
      }),
    );
  });

  it("shows an error and keeps inputs when creating a challenge fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/challenges": (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === "POST"
          ? { body: { error: "deck_not_found" }, status: 404 }
          : [],
      "/api/decks": [{ id: "deck-1", title: "국어", cardCount: 3 }],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const nameInput = await screen.findByLabelText("Challenge name");
    await user.type(nameInput, "새 챌린지");
    await user.selectOptions(screen.getByLabelText("Deck"), "deck-1");
    await user.clear(screen.getByLabelText("Intervals"));
    await user.type(screen.getByLabelText("Intervals"), "2,4,8");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("챌린지를 생성하지 못했습니다.")).toBeTruthy();
    expect(nameInput).toHaveProperty("value", "새 챌린지");
    expect(screen.getByLabelText("Intervals")).toHaveProperty("value", "2,4,8");
  });

  it("disables challenge creation when intervals contain invalid parts", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [],
      "/api/decks": [{ id: "deck-1", title: "국어", cardCount: 3 }],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Challenge name"), "새 챌린지");
    await user.selectOptions(screen.getByLabelText("Deck"), "deck-1");
    await user.clear(screen.getByLabelText("Intervals"));
    await user.type(screen.getByLabelText("Intervals"), "3,,5");

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toHaveProperty("disabled", true);

    await user.click(createButton);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/challenges",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("disables challenge creation when the name is blank", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [],
      "/api/decks": [{ id: "deck-1", title: "국어", cardCount: 3 }],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    await user.type(await screen.findByLabelText("Challenge name"), "   ");
    await user.selectOptions(screen.getByLabelText("Deck"), "deck-1");

    const createButton = screen.getByRole("button", { name: "Create" });
    expect(createButton).toHaveProperty("disabled", true);

    await user.click(createButton);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/challenges",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps delete and update-from-deck as row actions", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
      "/api/challenges/challenge-1/update-from-deck": { addedCount: 2 },
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(within(listItem).getByRole("button", { name: "Update from deck" }));
    expect(await screen.findByText("2 cards added")).toBeTruthy();

    await user.click(within(listItem).getByRole("button", { name: "Delete" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("reloads challenge progress after updating from deck", async () => {
    const user = userEvent.setup();
    let listCalls = 0;
    mockFetchByPath({
      "/api/challenges": () => {
        listCalls += 1;
        return [
          challenge({
            id: "challenge-1",
            name: "중간고사",
            totalCards: listCalls === 1 ? 10 : 12,
          }),
        ];
      },
      "/api/decks": [],
      "/api/challenges/challenge-1/update-from-deck": { addedCount: 2 },
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    expect(within(listItem).getByText("2/10")).toBeTruthy();

    await user.click(within(listItem).getByRole("button", { name: "Update from deck" }));

    expect(await screen.findByText("2 cards added")).toBeTruthy();
    expect(await within(listItem).findByText("2/12")).toBeTruthy();
  });

  it("shows an error when updating a challenge from deck fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
      "/api/challenges/challenge-1/update-from-deck": {
        body: { error: "challenge_not_found" },
        status: 404,
      },
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(within(listItem).getByRole("button", { name: "Update from deck" }));

    expect(await screen.findByText("챌린지를 업데이트하지 못했습니다.")).toBeTruthy();
    expect(within(listItem).getByText("2/10")).toBeTruthy();
  });

  it("renames a challenge from the row actions", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(within(listItem).getByRole("button", { name: "Edit" }));
    const nameInput = within(listItem).getByLabelText("Challenge name");
    await user.clear(nameInput);
    await user.type(nameInput, "기말고사");
    await user.click(within(listItem).getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "기말고사" }),
      }),
    );
  });

  it("shows an error and keeps editing when renaming a challenge fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
      "/api/challenges/challenge-1": {
        body: { error: "challenge_not_found" },
        status: 404,
      },
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(within(listItem).getByRole("button", { name: "Edit" }));
    const nameInput = within(listItem).getByLabelText("Challenge name");
    await user.clear(nameInput);
    await user.type(nameInput, "기말고사");
    await user.click(within(listItem).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("챌린지 이름을 저장하지 못했습니다.")).toBeTruthy();
    expect(within(listItem).getByLabelText("Challenge name")).toHaveProperty(
      "value",
      "기말고사",
    );
  });

  it("shows an error and keeps the row when deleting a challenge fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/decks": [],
      "/api/challenges/challenge-1": {
        body: { error: "challenge_not_found" },
        status: 404,
      },
    });

    render(
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>,
    );

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(within(listItem).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("챌린지를 삭제하지 못했습니다.")).toBeTruthy();
    expect(screen.getByTestId("challenge-row-challenge-1")).toBeTruthy();
  });
});

type MockResponse =
  | unknown
  | ((input: RequestInfo | URL, init?: RequestInit) => unknown)
  | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();

    const rawResponse = responsesByPath[path] ?? {};
    const response =
      typeof rawResponse === "function"
        ? rawResponse(input, init)
        : rawResponse;
    const status = isMockErrorResponse(response) ? response.status : 200;
    const body = isMockErrorResponse(response) ? response.body : response;

    if (
      path === "/api/challenges/challenge-1" &&
      init?.method === "PATCH" &&
      !isMockErrorResponse(response)
    ) {
      return Promise.resolve(
        new Response(
          JSON.stringify(challenge({ id: "challenge-1", name: "기말고사" })),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    }

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

function challenge(input: { id: string; name: string; totalCards?: number }) {
  const totalCards = input.totalCards ?? 10;

  return {
    id: input.id,
    name: input.name,
    deckId: "deck-1",
    deckTitle: "국어",
    status: "active",
    answerMode: "manual",
    reviewIntervalsDays: [3, 5, 10],
    maxStage: 3,
    dueCount: 1,
    progress: {
      totalCards,
      completedCards: 2,
      dueCards: 1,
      currentStageCounts: { 0: 8 },
    },
    nextDueAt: "2026-06-24T00:00:00.000Z",
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
