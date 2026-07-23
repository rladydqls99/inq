// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { CardPlayer } from "../src/shared/ui/CardPlayer";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("CardPlayer", () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("fires previous and next callbacks", async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        currentIndex={0}
        totalCards={2}
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByRole("button", { name: "이전 카드" }));
    await user.click(screen.getByRole("button", { name: "다음 카드" }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("shows result controls by default and reveals the answer when scored", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        currentIndex={0}
        totalCards={2}
        onResult={onResult}
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 ____이다.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "틀렸어요" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "맞았어요" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "맞았어요" }));

    expect(getByTextContent("훈민정음의 창제자는 세종대왕이다.")).toBeTruthy();
    expect(onResult).toHaveBeenCalledWith("correct");
  });

  it("syncs the revealed answer when selected result changes from props", () => {
    const { rerender } = render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        currentIndex={0}
        totalCards={2}
        selectedResult={null}
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 ____이다.")).toBeTruthy();

    rerender(
      <CardPlayer
        segments={segments}
        mode="challenge"
        currentIndex={0}
        totalCards={2}
        selectedResult="correct"
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 세종대왕이다.")).toBeTruthy();
  });

  it("reveals from the study card area and changes the action to next", async () => {
    const user = userEvent.setup();
    const onAnswerReveal = vi.fn();

    render(
      <CardPlayer
        segments={segments}
        mode="study"
        currentIndex={1}
        totalCards={3}
        onAnswerReveal={onAnswerReveal}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "카드 영역을 눌러 정답 보기" }),
    );

    expect(getByTextContent("훈민정음의 창제자는 세종대왕이다.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "다음 카드로 이동" }),
    ).toBeTruthy();
    expect(onAnswerReveal).toHaveBeenCalledTimes(1);
  });

  it("can show a study answer immediately without a reveal action", () => {
    render(
      <CardPlayer
        segments={segments}
        mode="study"
        currentIndex={0}
        totalCards={2}
        initiallyRevealed
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 세종대왕이다.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "정답 보기" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "다음 카드로 이동" }),
    ).toBeTruthy();
  });

  it("counts down and exposes a next-problem action after scoring", () => {
    vi.useFakeTimers();
    const onNext = vi.fn();

    render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        currentIndex={0}
        totalCards={2}
        selectedResult="correct"
        autoAdvanceSeconds={5}
        onNext={onNext}
      />,
    );

    expect(screen.getByText("5초")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("4초")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /다음 문제/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("shows progress and supports horizontal swipe navigation", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        currentIndex={1}
        totalCards={4}
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    const player = screen.getByRole("region", { name: "퀴즈 카드 2/4" });
    expect(screen.getByText("2 / 4")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "2",
    );

    fireEvent.touchStart(player, {
      changedTouches: [{ clientX: 240, clientY: 200 }],
    });
    fireEvent.touchEnd(player, {
      changedTouches: [{ clientX: 140, clientY: 204 }],
    });
    fireEvent.touchStart(player, {
      changedTouches: [{ clientX: 120, clientY: 200 }],
    });
    fireEvent.touchEnd(player, {
      changedTouches: [{ clientX: 210, clientY: 203 }],
    });

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });
});

function getByTextContent(text: string) {
  return screen.getByText((_, element) => {
    if (element?.textContent !== text) {
      return false;
    }

    return Array.from(element.children).every(
      (child) => child.textContent !== text,
    );
  });
}
