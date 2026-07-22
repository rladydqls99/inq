import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  BackupExport,
  CardResponse,
  ChallengeResponse,
  ChallengeRunState,
  CreateDeckRequest,
  DeckRunResponse,
  ImportPreviewResponse,
  QuizSegment,
  UnlockResponse,
} from "../src";

describe("shared domain types", () => {
  it("exports quiz segment and answer mode types", () => {
    const segments: QuizSegment[] = [
      { type: "text", value: "훈민정음을 만든 " },
      { type: "answer", id: "answer-1", value: "세종대왕" },
      { type: "text", value: "이다." },
    ];
    const answerMode = "manual" as const;

    expect(segments).toHaveLength(3);
    expect(answerMode).toBe("manual");
  });

  it("exports representative API request and response types", () => {
    expectTypeOf<CreateDeckRequest>().toEqualTypeOf<{ title: string }>();
    expectTypeOf<UnlockResponse>().toMatchTypeOf<{
      unlocked: true;
      expiresAt: string;
    }>();
    expectTypeOf<CardResponse>().toHaveProperty("segments").toEqualTypeOf<
      QuizSegment[]
    >();
    expectTypeOf<ChallengeResponse>().toHaveProperty("answerMode").toEqualTypeOf<
      "manual"
    >();
    expectTypeOf<ImportPreviewResponse>()
      .toHaveProperty("previewCards")
      .items.toHaveProperty("segments")
      .toEqualTypeOf<QuizSegment[]>();
    expectTypeOf<ChallengeRunState>()
      .toHaveProperty("cards")
      .items.toHaveProperty("selectedResult")
      .toEqualTypeOf<"correct" | "wrong" | null>();
    expectTypeOf<DeckRunResponse>()
      .toHaveProperty("cards")
      .items.toHaveProperty("segments")
      .toEqualTypeOf<QuizSegment[]>();
    expectTypeOf<BackupExport>()
      .toHaveProperty("challengeRunSessions")
      .items.toHaveProperty("queue")
      .items.toHaveProperty("segments")
      .toEqualTypeOf<QuizSegment[]>();
  });
});
