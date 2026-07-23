// @vitest-environment jsdom

import { cleanup, render, screen, within } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChallengeListPage } from "../src/pages/challenges/ChallengeListPage";

describe("ChallengeListPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders challenge cards that open the challenge card list", async () => {
    mockFetchByPath({
      "/api/challenges": [
        challenge({
          id: "challenge-1",
          name: "중간고사",
          currentStageCounts: { 0: 2, 1: 2, 2: 2, 3: 2 },
        }),
      ],
    });

    renderChallengeListPage();

    const row = await screen.findByRole("link", { name: /중간고사/ });
    expect(row.getAttribute("href")).toBe("/challenges/challenge-1/cards");
    const progress = within(row).getByRole("progressbar", {
      name: "중간고사 전체 진도",
    });
    expect(progress.getAttribute("aria-valuenow")).toBe("2");
    expect(progress.getAttribute("aria-valuemax")).toBe("10");
    expect(
      within(row)
        .getByRole("progressbar", { name: "3일 텀 완료" })
        .getAttribute("aria-valuenow"),
    ).toBe("6");
    expect(
      within(row)
        .getByRole("progressbar", { name: "5일 텀 완료" })
        .getAttribute("aria-valuenow"),
    ).toBe("4");
    expect(
      within(row)
        .getByRole("progressbar", { name: "10일 텀 완료" })
        .getAttribute("aria-valuenow"),
    ).toBe("2");
  });

  it("shows empty state and creates a challenge from the modal", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [],
      "/api/decks": [{ id: "deck-1", title: "국어", cardCount: 3 }],
    });

    renderChallengeListPage();

    expect(await screen.findByText("등록된 챌린지가 없습니다.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "챌린지 등록하기" }));
    await user.type(await screen.findByLabelText("챌린지 이름"), "새 챌린지");
    await user.selectOptions(screen.getByLabelText("덱"), "deck-1");
    await user.click(screen.getByRole("button", { name: "등록하기" }));

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

  it("uses the row menu for rename, update from deck, and delete", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/challenges": [challenge({ id: "challenge-1", name: "중간고사" })],
      "/api/challenges/challenge-1/update-from-deck": { addedCount: 2 },
    });

    renderChallengeListPage();

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await user.click(
      within(listItem).getByRole("button", { name: "중간고사 메뉴" }),
    );
    await user.click(
      within(listItem).getByRole("button", { name: "이름 변경" }),
    );
    const nameInput = within(listItem).getByLabelText("챌린지 이름");
    await user.clear(nameInput);
    await user.type(nameInput, "기말고사");
    await user.click(within(listItem).getByRole("button", { name: "저장" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "기말고사" }),
      }),
    );

    await user.click(
      within(listItem).getByRole("button", { name: "중간고사 메뉴" }),
    );
    await user.click(
      within(listItem).getByRole("button", { name: "덱에서 카드 갱신" }),
    );
    expect(
      await screen.findByText("2장의 카드가 추가되었습니다."),
    ).toBeTruthy();

    await user.click(
      within(listItem).getByRole("button", { name: "중간고사 메뉴" }),
    );
    await user.click(within(listItem).getByRole("button", { name: "삭제" }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows an error when loading challenges fails", async () => {
    mockFetchByPath({
      "/api/challenges": {
        body: { error: "challenge_list_failed" },
        status: 500,
      },
    });

    renderChallengeListPage();

    expect(
      await screen.findByText("챌린지 목록을 불러오지 못했습니다."),
    ).toBeTruthy();
  });

  it("disables deck refresh when the source deck has been deleted", async () => {
    mockFetchByPath({
      "/api/challenges": [
        challenge({
          id: "challenge-1",
          name: "보존된 챌린지",
          sourceDeckId: null,
        }),
      ],
    });

    renderChallengeListPage();

    const listItem = await screen.findByTestId("challenge-row-challenge-1");
    await userEvent
      .setup()
      .click(
        within(listItem).getByRole("button", { name: "보존된 챌린지 메뉴" }),
      );
    const updateButton = within(listItem).getByRole("button", {
      name: "덱에서 카드 갱신",
    });
    expect((updateButton as HTMLButtonElement).disabled).toBe(true);
    expect(updateButton.getAttribute("title")).toBe(
      "원본 덱이 삭제되어 카드를 갱신할 수 없습니다.",
    );
  });
});

function renderChallengeListPage() {
  render(
    <MemoryRouter>
      <ChallengeListPage />
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

    if (path === "/api/challenges" && init?.method === "POST") {
      return Promise.resolve(
        jsonResponse(challenge({ id: "created", name: "새 챌린지" }), 201),
      );
    }

    if (path === "/api/challenges/challenge-1" && init?.method === "PATCH") {
      return Promise.resolve(
        jsonResponse(challenge({ id: "challenge-1", name: "기말고사" })),
      );
    }

    const response =
      typeof rawResponse === "function"
        ? rawResponse(input, init)
        : rawResponse;
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

function challenge(input: {
  id: string;
  name: string;
  currentStageCounts?: Record<number, number>;
  sourceDeckId?: string | null;
}) {
  return {
    id: input.id,
    name: input.name,
    sourceDeckId:
      input.sourceDeckId === undefined ? "deck-1" : input.sourceDeckId,
    deckTitle: "국어",
    status: "active",
    answerMode: "manual",
    reviewIntervalsDays: [3, 5, 10],
    maxStage: 3,
    dueCount: 1,
    progress: {
      totalCards: 10,
      completedCards: 2,
      dueCards: 1,
      currentStageCounts: input.currentStageCounts ?? { 0: 8 },
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
