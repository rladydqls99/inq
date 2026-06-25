// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChallengeRunnerPage } from "../src/features/runners/ChallengeRunnerPage";

describe("ChallengeRunnerPage", () => {
  afterEach(() => {
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

    await waitFor(() => {
      expect(
        screen.getByText((_, element) =>
          matchesTextContent(element, "조선의 수도는 ____이다."),
        ),
      ).toBeTruthy();
    });
  });
});

function matchesTextContent(element: Element | null, text: string) {
  if (element?.textContent !== text) {
    return false;
  }

  return Array.from(element.children).every((child) => child.textContent !== text);
}

function mockFetch() {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();

    if (path === "/api/challenges/challenge-1/run") {
      return Promise.resolve(jsonResponse(runState()));
    }

    if (path === "/api/challenges/challenge-1/results" && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ runState: runState(), progress: {} }));
    }

    return Promise.resolve(jsonResponse({}));
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function runState() {
  return {
    sessionId: "session-1",
    challengeId: "challenge-1",
    status: "active",
    cursor: 0,
    cards: [
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
    ],
  };
}
