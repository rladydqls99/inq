// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { QuizPreview } from "../src/components/QuizPreview";

describe("QuizPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the revealed card once without a blank prompt", () => {
    const segments: QuizSegment[] = [
      { type: "text", value: "조선의 왕은 " },
      { type: "answer", id: "answer-1", value: "세종대왕" },
      { type: "text", value: " 이다." },
    ];

    render(<QuizPreview segments={segments} />);

    expect(screen.getByText("조선의 왕은 세종대왕 이다.")).toBeTruthy();
    expect(screen.queryByText("조선의 왕은 ____ 이다.")).toBeNull();
  });
});
