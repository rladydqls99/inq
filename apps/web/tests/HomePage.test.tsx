// @vitest-environment jsdom

import { cleanup, render, screen, within } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../src/pages/challenges/HomePage";

describe("HomePage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("features the highest-priority due challenge and links directly to its run", async () => {
    mockChallenges([
      challenge({
        id: "later",
        name: "나중 복습",
        nextDueAt: "2026-07-12T10:00:00.000Z",
        dueCount: 4,
      }),
      challenge({
        id: "soon",
        name: "먼저 복습",
        nextDueAt: "2026-07-11T08:00:00.000Z",
        dueCount: 2,
      }),
      challenge({
        id: "future",
        name: "미래 복습",
        nextDueAt: "2026-07-14T08:00:00.000Z",
        dueCount: 0,
      }),
    ]);

    renderHomePage();

    expect(
      await screen.findByRole("heading", { name: "먼저 복습" }),
    ).toBeTruthy();
    expect(screen.getByText("2문제").getAttribute("aria-label")).toBe(
      "오늘 풀 문제는 2개입니다.",
    );
    expect(
      screen.getByRole("link", { name: "복습 시작" }).getAttribute("href"),
    ).toBe("/challenges/soon/run");
  });

  it("does not duplicate the featured challenge in the next-review list", async () => {
    mockChallenges([
      challenge({ id: "featured", name: "대표 복습", dueCount: 3 }),
      challenge({ id: "next", name: "다음 복습 항목", dueCount: 1 }),
    ]);

    renderHomePage();

    const nextSection = await screen.findByRole("region", {
      name: "다음 복습",
    });
    expect(within(nextSection).queryByText("대표 복습")).toBeNull();
    expect(within(nextSection).getByText("다음 복습 항목")).toBeTruthy();
    expect(
      within(nextSection)
        .getByRole("link", { name: /다음 복습 항목/ })
        .getAttribute("href"),
    ).toBe("/challenges/next/cards");
  });

  it("requests only challenges and never requests decks", async () => {
    const fetchMock = mockChallenges([
      challenge({ id: "challenge-1", name: "한국사" }),
    ]);

    renderHomePage();

    expect(
      await screen.findByRole("heading", { name: "한국사", level: 2 }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/challenges");
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).includes("/decks")),
    ).toBe(false);
  });

  it("guides the user to create a challenge when there are no active challenges", async () => {
    mockChallenges([
      challenge({
        id: "paused",
        name: "중지된 챌린지",
        status: "paused",
      }),
    ]);

    renderHomePage();

    expect(
      await screen.findByRole("heading", { name: "첫 복습을 만들어 보세요" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "챌린지 만들기" }).getAttribute("href"),
    ).toBe("/challenges");
  });

  it("shows completion and the nearest readable schedule when nothing is due", async () => {
    mockChallenges([
      challenge({
        id: "later",
        name: "나중 일정",
        nextDueAt: "2026-07-15T10:00:00.000Z",
        dueCount: 0,
      }),
      challenge({
        id: "nearest",
        name: "가장 가까운 일정",
        nextDueAt: "2026-07-12T10:00:00.000Z",
        dueCount: 0,
      }),
    ]);

    renderHomePage();

    expect(
      await screen.findByRole("heading", { name: "오늘 복습 완료" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/다음 복습은 .*7월 12일.*시작할 수 있어요/),
    ).toBeTruthy();
    const nextSection = screen.getByRole("region", { name: "다음 복습" });
    expect(within(nextSection).getByText("가장 가까운 일정")).toBeTruthy();
    expect(within(nextSection).getByText("나중 일정")).toBeTruthy();
  });

  it("retries the challenges request after an error", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "failed" }, 500))
      .mockResolvedValueOnce(
        jsonResponse([challenge({ id: "retry", name: "다시 불러온 복습" })]),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderHomePage();

    expect(
      await screen.findByRole("heading", {
        name: "복습 목록을 가져오지 못했어요",
      }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("다시 불러온 복습")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renders a structural skeleton while loading without empty-state headings", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pendingResponse),
    );

    const { container } = renderHomePage();

    expect(
      screen.getByRole("heading", {
        name: "오늘의 복습을 불러오는 중입니다.",
      }),
    ).toBeTruthy();
    expect(container.querySelectorAll(".home-skeleton").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByRole("heading", { name: "다음 복습" })).toBeNull();
    expect(screen.queryByText("첫 복습을 만들어 보세요")).toBeNull();

    resolveFetch?.(jsonResponse([]));
    expect(
      await screen.findByRole("heading", { name: "첫 복습을 만들어 보세요" }),
    ).toBeTruthy();
  });

  it("keeps a long user-generated title available as full accessible text", async () => {
    const longName =
      "한국사능력검정시험 심화 근현대사 독립운동 단체와 주요 인물 완전 정복 챌린지";
    mockChallenges([challenge({ id: "long", name: longName })]);

    renderHomePage();

    const heading = await screen.findByRole("heading", { name: longName });
    expect(heading.textContent).toBe(longName);
    expect(heading.getAttribute("title")).toBe(longName);
  });

  it("sorts valid dates ahead of invalid dates without breaking the UI", async () => {
    mockChallenges([
      challenge({
        id: "invalid",
        name: "잘못된 날짜",
        nextDueAt: "not-a-date",
        dueCount: 2,
      }),
      challenge({
        id: "valid",
        name: "정상 날짜",
        nextDueAt: "2026-07-13T10:00:00.000Z",
        dueCount: 1,
      }),
      challenge({
        id: "missing",
        name: "날짜 없음",
        nextDueAt: null,
        dueCount: 0,
      }),
    ]);

    renderHomePage();

    expect(
      await screen.findByRole("heading", { name: "정상 날짜" }),
    ).toBeTruthy();
    expect(screen.getByText("잘못된 날짜")).toBeTruthy();
    expect(screen.getByText("날짜 없음")).toBeTruthy();
    expect(
      screen.getByText("다음 복습 일정이 아직 정해지지 않았어요."),
    ).toBeTruthy();
  });
});

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

function mockChallenges(challenges: ReturnType<typeof challenge>[]) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();

    if (path !== "/api/challenges") {
      return Promise.resolve(
        jsonResponse({ error: `Unexpected path: ${path}` }, 500),
      );
    }

    return Promise.resolve(jsonResponse(challenges));
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function challenge({
  id,
  name,
  nextDueAt = "2026-07-11T08:00:00.000Z",
  dueCount = 1,
  status = "active",
}: {
  id: string;
  name: string;
  nextDueAt?: string | null;
  dueCount?: number;
  status?: "active" | "paused";
}) {
  return {
    id,
    name,
    sourceDeckId: `deck-${id}`,
    deckTitle: "한국사",
    status,
    answerMode: "manual" as const,
    reviewIntervalsDays: [3, 5, 10],
    maxStage: 3,
    dueCount,
    progress: {
      totalCards: 10,
      completedCards: 2,
      dueCards: dueCount,
      currentStageCounts: { 0: 8 },
    },
    nextDueAt,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
