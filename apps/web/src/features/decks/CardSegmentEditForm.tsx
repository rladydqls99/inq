import { useState } from "react";

import type { QuizSegment } from "@inq/shared";
import { DeckQuizPreview } from "./DeckQuizPreview";

type CardSegmentEditFormProps = {
  segments: QuizSegment[];
  onSave: (segments: QuizSegment[]) => Promise<void> | void;
  onDirty?: () => void;
};

export function CardSegmentEditForm({
  segments,
  onSave,
  onDirty,
}: CardSegmentEditFormProps) {
  const [draftSegments, setDraftSegments] = useState<QuizSegment[]>(segments);
  const canSave = draftSegments.every(
    (segment) => segment.type !== "answer" || segment.value.trim().length > 0,
  );

  function updateSegment(index: number, value: string) {
    onDirty?.();
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
    <form className="grid gap-4" onSubmit={submit}>
      <DeckQuizPreview segments={draftSegments} />
      <div className="grid gap-3">
        {draftSegments.map((segment, index) => (
          <label
            className="grid gap-1.5 text-sm font-bold text-inq-ink"
            key={`${segment.type}-${index}`}
          >
            {segment.type === "answer"
              ? `정답 ${countSegments(draftSegments, index, "answer")}`
              : `본문 ${countSegments(draftSegments, index, "text")}`}
            <textarea
              className="min-h-24 resize-y rounded-lg border border-inq-line bg-inq-canvas px-3.5 py-3 text-base font-medium text-inq-ink outline-none focus-visible:border-inq-highlight-strong focus-visible:ring-3 focus-visible:ring-inq-highlight-strong/30"
              value={segment.value}
              onChange={(event) => updateSegment(index, event.target.value)}
            />
          </label>
        ))}
      </div>
      <button
        className="min-h-12 cursor-pointer rounded-lg border-0 bg-inq-ink px-[18px] py-3 text-sm font-bold text-inq-canvas disabled:cursor-not-allowed disabled:bg-inq-line disabled:text-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98]"
        type="submit"
        disabled={!canSave}
      >
        저장
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
