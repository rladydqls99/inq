// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { CardPlayer } from "../src/components/CardPlayer";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("CardPlayer", () => {
  afterEach(() => {
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
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByRole("button", { name: "이전" }));
    await user.click(screen.getByRole("button", { name: "다음" }));

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("keeps the answer hidden until the selected challenge result is saved", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        onResult={onResult}
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 ____이다.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "맞음" }));

    expect(onResult).toHaveBeenCalledWith("correct");
    expect(getByTextContent("훈민정음의 창제자는 ____이다.")).toBeTruthy();
  });

  it("syncs the revealed answer when selected result changes from props", () => {
    const { rerender } = render(
      <CardPlayer
        segments={segments}
        mode="challenge"
        selectedResult={null}
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 ____이다.")).toBeTruthy();

    rerender(
      <CardPlayer
        segments={segments}
        mode="challenge"
        selectedResult="correct"
      />,
    );

    expect(getByTextContent("훈민정음의 창제자는 세종대왕이다.")).toBeTruthy();
  });

  it("reveals inline answer in study mode", async () => {
    const user = userEvent.setup();

    render(<CardPlayer segments={segments} mode="study" />);

    await user.click(screen.getByRole("button", { name: "정답 보기" }));

    expect(getByTextContent("훈민정음의 창제자는 세종대왕이다.")).toBeTruthy();
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
