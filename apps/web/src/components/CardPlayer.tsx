import { useState } from "react";

import type { QuizSegment } from "@inq/shared";
import {
  QuizTextRenderer,
  type AnswerTone,
} from "./QuizTextRenderer";

type CardPlayerProps = {
  segments: QuizSegment[];
  mode: "challenge" | "study";
  selectedResult?: "correct" | "wrong" | null;
  onPrevious?: () => void;
  onNext?: () => void;
  onResult?: (result: "correct" | "wrong") => void;
};

export function CardPlayer({
  segments,
  mode,
  selectedResult = null,
  onPrevious,
  onNext,
  onResult,
}: CardPlayerProps) {
  const [studyRevealed, setStudyRevealed] = useState(false);

  const revealed = mode === "challenge" ? selectedResult !== null : studyRevealed;
  const tone: AnswerTone =
    mode === "study" ? "study" : selectedResult === "wrong" ? "wrong" : "correct";

  function selectResult(result: "correct" | "wrong") {
    onResult?.(result);
  }

  return (
    <section className="card-player">
      <QuizTextRenderer
        mode={revealed ? "revealed" : "prompt"}
        segments={segments}
        tone={revealed ? tone : "neutral"}
      />

      <div className="card-player__controls">
        <button type="button" onClick={onPrevious}>
          이전
        </button>
        <button type="button" onClick={onNext}>
          다음
        </button>
      </div>

      {mode === "challenge" ? (
        <div className="card-player__result-controls">
          <button type="button" onClick={() => selectResult("wrong")}>
            틀림
          </button>
          <button type="button" onClick={() => selectResult("correct")}>
            맞음
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setStudyRevealed(true)}>
          정답 보기
        </button>
      )}
    </section>
  );
}
