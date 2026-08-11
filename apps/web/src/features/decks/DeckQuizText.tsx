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
    <p
      className={["m-0 text-[22px] font-semibold text-inq-ink", className]
        .filter(Boolean)
        .join(" ")}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          const value =
            index === 0
              ? segment.value.trimStart()
              : index === segments.length - 1
                ? segment.value.trimEnd()
                : segment.value;

          return <span key={`text-${index}`}>{value}</span>;
        }

        return mode === "prompt" ? (
          <span
            key={segment.id}
            className="inline-block min-w-[2.5em] border-b-2 border-inq-ink-soft px-[3px] leading-none text-transparent"
          >
            ____
          </span>
        ) : (
          <span
            key={segment.id}
            className={`is-${tone} rounded bg-inq-highlight px-[3px] font-extrabold text-inq-on-highlight box-decoration-clone`}
          >
            {segment.value}
          </span>
        );
      })}
    </p>
  );
}
