export function matchingVoiceAnswerIds(
  transcript: string,
  answers: { id: string; value: string }[],
) {
  return answers
    .filter((answer) => transcript.includes(answer.value))
    .map((answer) => answer.id);
}
