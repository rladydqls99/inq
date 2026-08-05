import { getAnswers, type QuizSegment } from "@inq/shared";

import { DeckQuizText } from "./DeckQuizText";

export function DeckQuizPreview({ segments }: { segments: QuizSegment[] }) {
  return (
    <div className="quiz-preview">
      <DeckQuizText mode="revealed" segments={segments} tone="study" />
      <span className="quiz-preview__count">{getAnswers(segments).length}</span>
    </div>
  );
}
