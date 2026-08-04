export const VOICE_ANSWER_STORAGE_KEY = "inq:voice-answer-enabled";
export const VOICE_ANSWER_CHANGE_EVENT = "inq:voice-answer-change";

export function isVoiceAnswerEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(VOICE_ANSWER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setVoiceAnswerEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(VOICE_ANSWER_STORAGE_KEY, String(enabled));
  } catch {
    // Keep the in-memory setting usable when storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent<boolean>(VOICE_ANSWER_CHANGE_EVENT, { detail: enabled }),
  );
}
