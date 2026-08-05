import type { QuizSegment } from "@inq/shared";
import { X } from "lucide-react";

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
    <p className={["quiz-text", className].filter(Boolean).join(" ")}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`text-${index}`}>{segment.value}</span>;
        }

        if (mode === "revealed" || revealedAnswerIds.includes(segment.id)) {
          return (
            <span
              key={segment.id}
              className={`quiz-text__answer is-${
                mode === "revealed" ? tone : "correct"
              }`}
            >
              {segment.value}
            </span>
          );
        }

        return showWrongAnswers ? (
          <span key={segment.id} className="quiz-text__wrong" aria-label="오답">
            <X aria-hidden="true" size={18} strokeWidth={3} />
          </span>
        ) : (
          <span key={segment.id} className="quiz-text__blank">
            ____
          </span>
        );
      })}
    </p>
  );
}
