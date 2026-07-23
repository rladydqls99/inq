// @vitest-environment jsdom

import { cleanup, render, screen } from "./test-utils";
import { afterEach, describe, expect, it } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { QuizTextRenderer } from "../src/shared/ui/QuizTextRenderer";

const segments: QuizSegment[] = [
  { type: "text", value: "훈민정음을 만든 " },
  { type: "answer", id: "answer-1", value: "조선" },
  { type: "text", value: "의 왕은 " },
  { type: "answer", id: "answer-2", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("QuizTextRenderer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders answer segments as blanks in prompt mode", () => {
    render(<QuizTextRenderer mode="prompt" segments={segments} />);

    expect(
      getByTextContent("훈민정음을 만든 ____의 왕은 ____이다."),
    ).toBeTruthy();
  });

  it("renders revealed answers inline instead of below the sentence", () => {
    render(<QuizTextRenderer mode="revealed" segments={segments} />);

    expect(
      getByTextContent("훈민정음을 만든 조선의 왕은 세종대왕이다."),
    ).toBeTruthy();
  });

  it("applies answer tone classes", () => {
    const { rerender } = render(
      <QuizTextRenderer mode="revealed" segments={segments} tone="correct" />,
    );
    expect(screen.getByText("조선").className).toContain("is-correct");

    rerender(
      <QuizTextRenderer mode="revealed" segments={segments} tone="wrong" />,
    );
    expect(screen.getByText("조선").className).toContain("is-wrong");

    rerender(
      <QuizTextRenderer mode="revealed" segments={segments} tone="study" />,
    );
    expect(screen.getByText("조선").className).toContain("is-study");
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
