import type { QuizSegment } from "@inq/shared";

export type QuizTextMode = "prompt" | "revealed";
export type AnswerTone = "neutral" | "correct" | "wrong" | "study";

type QuizTextRendererProps = {
  segments: QuizSegment[];
  mode: QuizTextMode;
  tone?: AnswerTone;
};

export function QuizTextRenderer({
  segments,
  mode,
  tone = "neutral",
}: QuizTextRendererProps) {
  return (
    <p className="quiz-text">
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`text-${index}`}>{segment.value}</span>;
        }

        if (mode === "prompt") {
          return (
            <span key={segment.id} className="quiz-text__blank">
              ____
            </span>
          );
        }

        return (
          <span
            key={segment.id}
            className={`quiz-text__answer is-${tone}`}
          >
            {segment.value}
          </span>
        );
      })}
    </p>
  );
}
