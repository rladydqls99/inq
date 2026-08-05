import { describe, expect, it } from "vitest";

import { matchingVoiceAnswerIds } from "../src/widgets/voiceAnswerMatch";

describe("matchingVoiceAnswerIds", () => {
  it("returns only the answer IDs spoken in the transcript", () => {
    const answers = [
      { id: "answer-hunmin", value: "훈민정음" },
      { id: "answer-sejong", value: "세종" },
    ];

    expect(matchingVoiceAnswerIds("세종", answers)).toEqual(["answer-sejong"]);
    expect(matchingVoiceAnswerIds("훈민정음 세종", answers)).toEqual([
      "answer-hunmin",
      "answer-sejong",
    ]);
    expect(matchingVoiceAnswerIds("태종", answers)).toEqual([]);
  });
});
