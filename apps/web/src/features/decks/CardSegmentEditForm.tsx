import { useState } from "react";

import type { QuizSegment } from "@inq/shared";
import { QuizPreview } from "../../components/QuizPreview";

type CardSegmentEditFormProps = {
  segments: QuizSegment[];
  onSave: (segments: QuizSegment[]) => Promise<void> | void;
};

export function CardSegmentEditForm({
  segments,
  onSave,
}: CardSegmentEditFormProps) {
  const [draftSegments, setDraftSegments] = useState<QuizSegment[]>(segments);
  const canSave = draftSegments.every(
    (segment) => segment.type !== "answer" || segment.value.trim().length > 0,
  );

  function updateSegment(index: number, value: string) {
    setDraftSegments((current) =>
      current.map((segment, currentIndex) =>
        currentIndex === index ? { ...segment, value } : segment,
      ),
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    await onSave(draftSegments);
  }

  return (
    <form className="segment-edit-form" onSubmit={submit}>
      <QuizPreview segments={draftSegments} />
      <div className="segment-edit-form__fields">
        {draftSegments.map((segment, index) => (
          <label key={`${segment.type}-${index}`}>
            {segment.type === "answer"
              ? `Answer ${countSegments(draftSegments, index, "answer")}`
              : `Text ${countSegments(draftSegments, index, "text")}`}
            <textarea
              value={segment.value}
              onChange={(event) => updateSegment(index, event.target.value)}
            />
          </label>
        ))}
      </div>
      <button type="submit" disabled={!canSave}>
        Save
      </button>
    </form>
  );
}

function countSegments(
  segments: QuizSegment[],
  untilIndex: number,
  type: QuizSegment["type"],
) {
  return segments
    .slice(0, untilIndex + 1)
    .filter((segment) => segment.type === type).length;
}
