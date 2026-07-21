import { describe, expect, it } from "vitest";

import { parseMarkdownImport } from "../src";

describe("parseMarkdownImport", () => {
  it("parses a valid single-answer quiz block", () => {
    const result = parseMarkdownImport(
      "훈민정음을 만든 조선의 왕은 [세종대왕]이다.",
    );

    expect(result).toEqual({
      parsed: 1,
      errors: [],
      previewCards: [
        {
          blockIndex: 0,
          segments: [
            { type: "text", value: "훈민정음을 만든 조선의 왕은 " },
            { type: "answer", id: "answer-1", value: "세종대왕" },
            { type: "text", value: "이다." },
          ],
        },
      ],
    });
  });

  it("parses a valid quiz block with multiple answers", () => {
    const result = parseMarkdownImport(
      "훈민정음을 만든 [조선]의 왕은 [세종대왕]이다.",
    );

    expect(result.errors).toEqual([]);
    expect(result.previewCards[0]?.segments).toEqual([
      { type: "text", value: "훈민정음을 만든 " },
      { type: "answer", id: "answer-1", value: "조선" },
      { type: "text", value: "의 왕은 " },
      { type: "answer", id: "answer-2", value: "세종대왕" },
      { type: "text", value: "이다." },
    ]);
  });

  it("trims whitespace around answer values", () => {
    const result = parseMarkdownImport("동명사를 목적어로 취하는 동사는 [ avoid ]이다.");

    expect(result.errors).toEqual([]);
    expect(result.previewCards[0]?.segments).toEqual([
      { type: "text", value: "동명사를 목적어로 취하는 동사는 " },
      { type: "answer", id: "answer-1", value: "avoid" },
      { type: "text", value: "이다." },
    ]);
  });

  it("collapses whitespace inside a card while preserving inline spacing", () => {
    const result = parseMarkdownImport(
      "  조선의\n   왕은 [ 세종대왕 ]\n 이다.  ",
    );

    expect(result.errors).toEqual([]);
    expect(result.previewCards[0]?.segments).toEqual([
      { type: "text", value: "조선의 왕은 " },
      { type: "answer", id: "answer-1", value: "세종대왕" },
      { type: "text", value: " 이다." },
    ]);
  });

  it("splits cards only when a trimmed line equals separator", () => {
    const result = parseMarkdownImport(
      [
        "첫 번째 [정답]",
        " --- ",
        "두 번째 문장에는 --- 이 있지만 [구분자]가 아니다.",
      ].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.parsed).toBe(2);
    expect(result.previewCards.map((card) => card.blockIndex)).toEqual([0, 1]);
    expect(result.previewCards[1]?.segments).toEqual([
      { type: "text", value: "두 번째 문장에는 --- 이 있지만 " },
      { type: "answer", id: "answer-1", value: "구분자" },
      { type: "text", value: "가 아니다." },
    ]);
  });

  it("ignores empty blocks between separators", () => {
    const result = parseMarkdownImport("첫 [정답]\n---\n\n---\n둘 [정답]");

    expect(result.errors).toEqual([]);
    expect(result.parsed).toBe(2);
    expect(result.previewCards.map((card) => card.blockIndex)).toEqual([0, 2]);
  });

  it("returns missing_answer when a block has no answer segment", () => {
    const result = parseMarkdownImport("정답 괄호가 없는 문제");

    expect(result).toMatchObject({
      parsed: 0,
      previewCards: [],
      errors: [
        {
          blockIndex: 0,
          line: 1,
          column: null,
          code: "missing_answer",
          snippet: "정답 괄호가 없는 문제",
        },
      ],
    });
  });

  it("returns empty_import when markdown has no quiz blocks", () => {
    const result = parseMarkdownImport("  \n---\n\n");

    expect(result).toMatchObject({
      parsed: 0,
      previewCards: [],
      errors: [
        {
          blockIndex: 0,
          line: null,
          column: null,
          code: "empty_import",
          snippet: "",
        },
      ],
    });
  });

  it("returns unmatched_open_bracket with a 1-based location", () => {
    const result = parseMarkdownImport("첫 줄\n둘째 줄 [정답");

    expect(result.errors).toEqual([
      {
        blockIndex: 0,
        line: 2,
        column: 6,
        code: "unmatched_open_bracket",
        message: expect.any(String),
        snippet: "둘째 줄 [정답",
      },
    ]);
  });

  it("returns unmatched_close_bracket with a 1-based location", () => {
    const result = parseMarkdownImport("잘못된 ] 괄호");

    expect(result.errors).toEqual([
      {
        blockIndex: 0,
        line: 1,
        column: 5,
        code: "unmatched_close_bracket",
        message: expect.any(String),
        snippet: "잘못된 ] 괄호",
      },
    ]);
  });

  it("returns empty_answer for empty and whitespace answers", () => {
    const result = parseMarkdownImport("빈 답 []\n---\n공백 답 [   ]");

    expect(result.errors).toEqual([
      {
        blockIndex: 0,
        line: 1,
        column: 5,
        code: "empty_answer",
        message: expect.any(String),
        snippet: "빈 답 []",
      },
      {
        blockIndex: 1,
        line: 3,
        column: 6,
        code: "empty_answer",
        message: expect.any(String),
        snippet: "공백 답 [   ]",
      },
    ]);
  });

  it("returns nested_bracket when an answer contains another opening bracket", () => {
    const result = parseMarkdownImport("중첩 [[답]]");

    expect(result.errors).toEqual([
      {
        blockIndex: 0,
        line: 1,
        column: 5,
        code: "nested_bracket",
        message: expect.any(String),
        snippet: "중첩 [[답]]",
      },
    ]);
  });
});
