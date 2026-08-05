// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { ChallengeCardPlayer } from "../src/features/challenges/ChallengeCardPlayer";
import { DeckCardPlayer } from "../src/features/decks/DeckCardPlayer";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음의 창제자는 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("separate card players", () => {
  afterEach(cleanup);

  it("keeps challenge scoring and deck answer reveal separate", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const onAnswerReveal = vi.fn();
    const { rerender } = render(
      <ChallengeCardPlayer
        segments={segments}
        currentIndex={0}
        totalCards={2}
        selectedResult={null}
        canPrevious={false}
        canNext
        onPrevious={() => {}}
        onNext={() => {}}
        onResult={onResult}
      />,
    );

    await user.click(screen.getByRole("button", { name: "맞았어요" }));
    expect(onResult).toHaveBeenCalledWith("correct");

    rerender(
      <DeckCardPlayer
        segments={segments}
        currentIndex={0}
        totalCards={2}
        answerRevealed={false}
        canPrevious={false}
        canNext
        onPrevious={() => {}}
        onNext={() => {}}
        onMoveTo={() => {}}
        onAnswerReveal={onAnswerReveal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "정답 보기" }));
    expect(onAnswerReveal).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "맞았어요" })).toBeNull();
  });

  it("supports swipe navigation in the challenge player", () => {
    const onNext = vi.fn();
    render(
      <ChallengeCardPlayer
        segments={segments}
        currentIndex={0}
        totalCards={2}
        selectedResult={null}
        canPrevious={false}
        canNext
        onPrevious={() => {}}
        onNext={onNext}
        onResult={() => {}}
      />,
    );

    const player = screen.getByRole("region", { name: "퀴즈 카드 1/2" });
    fireEvent.touchStart(player, {
      changedTouches: [{ clientX: 240, clientY: 200 }],
    });
    fireEvent.touchEnd(player, {
      changedTouches: [{ clientX: 140, clientY: 204 }],
    });
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("moves to the card selected by dragging the progress bar", () => {
    const onMoveTo = vi.fn();
    render(
      <DeckCardPlayer
        segments={segments}
        currentIndex={0}
        totalCards={10}
        answerRevealed={false}
        canPrevious={false}
        canNext
        onPrevious={() => {}}
        onNext={() => {}}
        onMoveTo={onMoveTo}
        onAnswerReveal={() => {}}
      />,
    );

    const progress = screen.getByRole("slider", { name: "카드 학습 진행률" });
    Object.defineProperty(progress, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 100 }),
    });
    fireEvent.pointerDown(progress, { pointerId: 1, clientX: 75 });
    fireEvent.pointerUp(progress, { pointerId: 1, clientX: 75 });

    expect(onMoveTo).toHaveBeenCalledWith(7);
  });

  it("reveals only spoken answers and marks remaining blanks with an X", () => {
    render(
      <ChallengeCardPlayer
        segments={[
          { type: "answer", id: "hunmin", value: "훈민정음" },
          { type: "text", value: "을 만든 조선의 왕은 " },
          { type: "answer", id: "sejong", value: "세종" },
          { type: "text", value: "이다." },
        ]}
        currentIndex={0}
        totalCards={1}
        selectedResult={null}
        canPrevious={false}
        canNext={false}
        onPrevious={() => {}}
        onNext={() => {}}
        onResult={() => {}}
        revealedAnswerIds={["sejong"]}
        showWrongAnswers
      />,
    );

    expect(screen.getByText("세종")).toBeTruthy();
    expect(screen.getByLabelText("오답")).toBeTruthy();
    expect(screen.queryByText("훈민정음")).toBeNull();
  });
});
