// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChallengeRunnerPage } from "../src/features/runners/ChallengeRunnerPage";

describe("ChallengeRunnerPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads run state, reveals inline answer, persists result, and moves next", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch();

    render(
      <MemoryRouter initialEntries={["/challenges/challenge-1/run"]}>
        <Routes>
          <Route
            path="/challenges/:challengeId/run"
            element={<ChallengeRunnerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText((_, element) =>
        matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Correct" }));

    expect(
      screen.getByText((_, element) =>
        matchesTextContent(element, "훈민정음의 창제자는 세종대왕이다."),
      ),
    ).toBeTruthy();
    expect(screen.getByText("5s")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1/results",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sessionCardId: "session-card-1",
          finalResult: "correct",
        }),
      }),
    );

    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    await user.click(nextButtons[nextButtons.length - 1] as HTMLElement);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText((_, element) =>
          matchesTextContent(element, "조선의 수도는 ____이다."),
        ),
      ).toBeTruthy();
    });
  });

  it("moves past the final card into completed state", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ cardCount: 1 });

    render(
      <MemoryRouter initialEntries={["/challenges/challenge-1/run"]}>
        <Routes>
          <Route
            path="/challenges/:challengeId/run"
            element={<ChallengeRunnerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText((_, element) =>
      matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
    );
    await user.click(screen.getByRole("button", { name: "Correct" }));
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    await user.click(nextButtons[nextButtons.length - 1] as HTMLElement);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
      }),
    );
    expect(await screen.findByText("Completed")).toBeTruthy();
  });

  it("keeps the answered wrong card visible before advancing to the next queue card", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ moveWrongToBack: true });

    render(
      <MemoryRouter initialEntries={["/challenges/challenge-1/run"]}>
        <Routes>
          <Route
            path="/challenges/:challengeId/run"
            element={<ChallengeRunnerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText((_, element) =>
      matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
    );
    await user.click(screen.getByRole("button", { name: "Wrong" }));

    expect(
      screen.getByText((_, element) =>
        matchesTextContent(element, "훈민정음의 창제자는 세종대왕이다."),
      ),
    ).toBeTruthy();
    await screen.findByText("5s");

    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    await user.click(nextButtons[nextButtons.length - 1] as HTMLElement);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 0 }),
      }),
    );
    expect(
      await screen.findByText((_, element) =>
        matchesTextContent(element, "조선의 수도는 ____이다."),
      ),
    ).toBeTruthy();
  });

  it("shows an error and keeps the card unanswered when saving a result fails", async () => {
    const user = userEvent.setup();
    mockFetch({ failResult: true });

    render(
      <MemoryRouter initialEntries={["/challenges/challenge-1/run"]}>
        <Routes>
          <Route
            path="/challenges/:challengeId/run"
            element={<ChallengeRunnerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText((_, element) =>
      matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
    );
    await user.click(screen.getByRole("button", { name: "Correct" }));

    expect(await screen.findByText("결과를 저장하지 못했습니다.")).toBeTruthy();
    expect(
      screen.getByText((_, element) =>
        matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
      ),
    ).toBeTruthy();
    expect(screen.queryByText("5s")).toBeNull();
  });

  it("shows an error and keeps the answered card when moving fails", async () => {
    const user = userEvent.setup();
    mockFetch({ failMove: true });

    render(
      <MemoryRouter initialEntries={["/challenges/challenge-1/run"]}>
        <Routes>
          <Route
            path="/challenges/:challengeId/run"
            element={<ChallengeRunnerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText((_, element) =>
      matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
    );
    await user.click(screen.getByRole("button", { name: "Correct" }));
    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    await user.click(nextButtons[nextButtons.length - 1] as HTMLElement);

    expect(await screen.findByText("카드를 이동하지 못했습니다.")).toBeTruthy();
    expect(
      screen.getByText((_, element) =>
        matchesTextContent(element, "훈민정음의 창제자는 세종대왕이다."),
      ),
    ).toBeTruthy();
  });

  it("automatically advances five seconds after a result is selected", async () => {
    const fetchMock = mockFetch();

    render(
      <MemoryRouter initialEntries={["/challenges/challenge-1/run"]}>
        <Routes>
          <Route
            path="/challenges/:challengeId/run"
            element={<ChallengeRunnerPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText((_, element) =>
      matchesTextContent(element, "훈민정음의 창제자는 ____이다."),
    );

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Correct" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/challenges/challenge-1/run",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ cursor: 1 }),
      }),
    );
    expect(
      screen.getByText((_, element) =>
        matchesTextContent(element, "조선의 수도는 ____이다."),
      ),
    ).toBeTruthy();
  });
});

function matchesTextContent(element: Element | null, text: string) {
  if (element?.textContent !== text) {
    return false;
  }

  return Array.from(element.children).every((child) => child.textContent !== text);
}

function mockFetch(
  options: {
    cardCount?: number;
    failMove?: boolean;
    failResult?: boolean;
    moveWrongToBack?: boolean;
  } = {},
) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const state = runState(options);

    if (path === "/api/challenges/challenge-1/run" && init?.method === "PATCH") {
      if (options.failMove) {
        return Promise.resolve(jsonResponse({ error: "move_failed" }, 500));
      }

      const body = JSON.parse(init.body as string) as { cursor: number };
      const nextState = options.moveWrongToBack ? moveFirstCardToBack(state) : state;
      return Promise.resolve(jsonResponse({ ...nextState, cursor: body.cursor }));
    }

    if (path === "/api/challenges/challenge-1/run") {
      return Promise.resolve(jsonResponse(state));
    }

    if (path === "/api/challenges/challenge-1/results" && init?.method === "POST") {
      if (options.failResult) {
        return Promise.resolve(jsonResponse({ error: "result_failed" }, 500));
      }

      return Promise.resolve(
        jsonResponse({
          runState: options.moveWrongToBack ? moveFirstCardToBack(state) : state,
          progress: {},
        }),
      );
    }

    return Promise.resolve(jsonResponse({}));
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function moveFirstCardToBack(state: ReturnType<typeof runState>) {
  const [firstCard, ...remainingCards] = state.cards;

  return {
    ...state,
    cards: firstCard ? [...remainingCards, firstCard] : state.cards,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function runState(options: { cardCount?: number } = {}) {
  const cards = [
    {
      sessionCardId: "session-card-1",
      stateId: "state-1",
      cardId: "card-1",
      queueIndex: 0,
      selectedResult: null,
      segments: [
        { type: "text", value: "훈민정음의 창제자는 " },
        { type: "answer", id: "answer-1", value: "세종대왕" },
        { type: "text", value: "이다." },
      ],
    },
    {
      sessionCardId: "session-card-2",
      stateId: "state-2",
      cardId: "card-2",
      queueIndex: 1,
      selectedResult: null,
      segments: [
        { type: "text", value: "조선의 수도는 " },
        { type: "answer", id: "answer-1", value: "한양" },
        { type: "text", value: "이다." },
      ],
    },
  ].slice(0, options.cardCount ?? 2);

  return {
    sessionId: "session-1",
    challengeId: "challenge-1",
    status: "active",
    cursor: 0,
    cards,
  };
}
