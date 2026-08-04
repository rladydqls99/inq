import { describe, expect, it } from "vitest";

import { matchesVoiceAnswer } from "../src/widgets/voiceAnswerMatch";

describe("matchesVoiceAnswer", () => {
  it("requires every answer while allowing surrounding spoken words", () => {
    expect(matchesVoiceAnswer("정답은 세종 대왕입니다", ["세종"])).toBe(true);
    expect(
      matchesVoiceAnswer("조선의 왕은 세종대왕입니다", ["조선", "세종대왕"]),
    ).toBe(true);
    expect(matchesVoiceAnswer("세종대왕입니다", ["조선", "세종대왕"])).toBe(
      false,
    );
  });
});
