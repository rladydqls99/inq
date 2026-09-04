export const DECK_PROMPT_SPEECH_STORAGE_KEY = "inq:deck-prompt-speech-enabled";
export const DECK_PROMPT_SPEECH_CHANGE_EVENT = "inq:deck-prompt-speech-change";

export function isDeckPromptSpeechEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return (
      window.localStorage.getItem(DECK_PROMPT_SPEECH_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

export function setDeckPromptSpeechEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      DECK_PROMPT_SPEECH_STORAGE_KEY,
      String(enabled),
    );
  } catch {
    // Keep the in-memory setting usable when storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<boolean>(DECK_PROMPT_SPEECH_CHANGE_EVENT, {
      detail: enabled,
    }),
  );
}
