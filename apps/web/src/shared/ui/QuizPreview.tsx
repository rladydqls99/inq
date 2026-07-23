import type { QuizSegment } from "@inq/shared";
import { getAnswers } from "@inq/shared";

import { QuizTextRenderer } from "./QuizTextRenderer";

type QuizPreviewProps = {
  segments: QuizSegment[];
};

export function QuizPreview({ segments }: QuizPreviewProps) {
  return (
    <div className="quiz-preview">
      <QuizTextRenderer mode="revealed" segments={segments} tone="study" />
      <span className="quiz-preview__count">{getAnswers(segments).length}</span>
    </div>
  );
}
