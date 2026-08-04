export function matchesVoiceAnswer(transcript: string, answers: string[]) {
  return answers.every((answer) => transcript.includes(answer));
}
