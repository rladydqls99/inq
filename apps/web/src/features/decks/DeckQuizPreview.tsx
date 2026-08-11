import { getAnswers, type QuizSegment } from "@inq/shared";

import { DeckQuizText } from "./DeckQuizText";

export function DeckQuizPreview({ segments }: { segments: QuizSegment[] }) {
  return (
    <div className="grid gap-2">
      <DeckQuizText mode="revealed" segments={segments} tone="study" />
      <span className="text-xs font-bold text-inq-ink-soft">
        {getAnswers(segments).length}
      </span>
    </div>
  );
}
