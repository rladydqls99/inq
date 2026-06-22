import type { QuizSegment } from "./types";

export function getPromptText(segments: QuizSegment[]): string {
  return segments
    .map((segment) => (segment.type === "answer" ? "____" : segment.value))
    .join("");
}

export function getRevealedText(segments: QuizSegment[]): string {
  return segments.map((segment) => segment.value).join("");
}

export function getAnswers(segments: QuizSegment[]): string[] {
  return segments
    .filter((segment) => segment.type === "answer")
    .map((segment) => segment.value);
}

export function hasAnswerSegment(segments: QuizSegment[]): boolean {
  return segments.some((segment) => segment.type === "answer");
}
