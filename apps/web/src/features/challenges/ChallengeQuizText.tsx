import type { QuizSegment } from "@inq/shared";

type ChallengeQuizTextProps = {
  segments: QuizSegment[];
  mode: "prompt" | "revealed";
  tone?: "neutral" | "correct" | "wrong" | "study";
  className?: string;
  revealedAnswerIds?: string[];
  showWrongAnswers?: boolean;
};

export function ChallengeQuizText({
  segments,
  mode,
  tone = "neutral",
  className,
  revealedAnswerIds = [],
  showWrongAnswers = false,
}: ChallengeQuizTextProps) {
  return (
    <p
      className={["m-0 font-semibold text-inq-ink", className ?? "text-xl"]
        .filter(Boolean)
        .join(" ")}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`text-${index}`}>{segment.value}</span>;
        }

        if (mode === "revealed" || revealedAnswerIds.includes(segment.id)) {
          return (
            <span
              key={segment.id}
              className={`is-${mode === "revealed" ? tone : "correct"} rounded bg-inq-highlight px-[3px] font-extrabold text-inq-on-highlight box-decoration-clone`}
            >
              {segment.value}
            </span>
          );
        }

        return (
          <span
            key={segment.id}
            className={`inline-block min-w-[2.5em] border-b-2 px-[3px] leading-none text-transparent ${showWrongAnswers ? "is-wrong border-inq-error" : "border-inq-ink-soft"}`}
            aria-label={showWrongAnswers ? "오답" : undefined}
          >
            ____
          </span>
        );
      })}
    </p>
  );
}
