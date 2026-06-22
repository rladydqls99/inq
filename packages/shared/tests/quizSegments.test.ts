import { describe, expect, it } from "vitest";

import type { QuizSegment } from "../src";
import {
  getAnswers,
  getPromptText,
  getRevealedText,
  hasAnswerSegment,
} from "../src";

const quizSegments: QuizSegment[] = [
  { type: "text", value: "훈민정음을 만든 " },
  { type: "answer", id: "answer-1", value: "조선" },
  { type: "text", value: "의 왕은 " },
  { type: "answer", id: "answer-2", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("quiz segment helpers", () => {
  it("renders prompt text with blanks for answer segments", () => {
    expect(getPromptText(quizSegments)).toBe(
      "훈민정음을 만든 ____의 왕은 ____이다.",
    );
  });

  it("renders revealed text with inline answers", () => {
    expect(getRevealedText(quizSegments)).toBe(
      "훈민정음을 만든 조선의 왕은 세종대왕이다.",
    );
  });

  it("extracts answers in segment order", () => {
    expect(getAnswers(quizSegments)).toEqual(["조선", "세종대왕"]);
  });

  it("detects whether any answer segment exists", () => {
    expect(hasAnswerSegment(quizSegments)).toBe(true);
    expect(hasAnswerSegment([{ type: "text", value: "일반 문장" }])).toBe(
      false,
    );
  });
});
