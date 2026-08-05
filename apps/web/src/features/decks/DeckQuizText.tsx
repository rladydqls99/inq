import type { QuizSegment } from "@inq/shared";

type DeckQuizTextProps = {
  segments: QuizSegment[];
  mode: "prompt" | "revealed";
  tone?: "neutral" | "study";
  className?: string;
};

export function DeckQuizText({
  segments,
  mode,
  tone = "neutral",
  className,
}: DeckQuizTextProps) {
  return (
    <p className={["quiz-text", className].filter(Boolean).join(" ")}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`text-${index}`}>{segment.value}</span>;
        }

        return mode === "prompt" ? (
          <span key={segment.id} className="quiz-text__blank">
            ____
          </span>
        ) : (
          <span key={segment.id} className={`quiz-text__answer is-${tone}`}>
            {segment.value}
          </span>
        );
      })}
    </p>
  );
}
