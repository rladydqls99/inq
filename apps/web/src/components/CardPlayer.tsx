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
  const [localResult, setLocalResult] = useState<"correct" | "wrong" | null>(
    selectedResult,
  );
  const [studyRevealed, setStudyRevealed] = useState(false);
  const revealed = mode === "challenge" ? localResult !== null : studyRevealed;
  const tone: AnswerTone =
    mode === "study" ? "study" : localResult === "wrong" ? "wrong" : "correct";

  function selectResult(result: "correct" | "wrong") {
    setLocalResult(result);
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
          Previous
        </button>
        <button type="button" onClick={onNext}>
          Next
        </button>
      </div>

      {mode === "challenge" ? (
        <div className="card-player__result-controls">
          <button type="button" onClick={() => selectResult("wrong")}>
            Wrong
          </button>
          <button type="button" onClick={() => selectResult("correct")}>
            Correct
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setStudyRevealed(true)}>
          Show answer
        </button>
      )}
    </section>
  );
}
