// @vitest-environment jsdom

import { cleanup, render, screen } from "./test-utils";
import { afterEach, describe, expect, it } from "vitest";

import type { QuizSegment } from "@inq/shared";
import { QuizPreview } from "../src/shared/ui/QuizPreview";

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

    expect(
      screen.getByText(
        (_content, element) =>
          element?.textContent === "조선의 왕은 세종대왕 이다.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("조선의 왕은 ____ 이다.")).toBeNull();
  });
});
