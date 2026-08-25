import { getAnswers, type QuizSegment } from "@inq/shared";

import { DeckQuizText } from "./DeckQuizText";
import { QuizCategoryBadge } from "@/shared/ui/quiz-category-badge";

export function DeckQuizPreview({
  category,
  segments,
}: {
  category?: string | undefined;
  segments: QuizSegment[];
}) {
  return (
    <div className="grid gap-1.5">
      <QuizCategoryBadge category={category} />
      <DeckQuizText mode="revealed" segments={segments} tone="study" />
      <span className="text-xs font-bold text-inq-ink-soft">
        정답 {getAnswers(segments).length}개
      </span>
    </div>
  );
}
