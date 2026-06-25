type MediaSessionAction = "nexttrack" | "previoustrack";

type MediaSessionLike = {
  setActionHandler: (
    action: MediaSessionAction,
    handler: (() => void) | null,
  ) => void;
};

type MediaSessionHandlers = {
  onNext: () => void;
  onPrevious: () => void;
};

export function attachMediaSessionHandlers({
  onNext,
  onPrevious,
}: MediaSessionHandlers) {
  const mediaSession = getMediaSession();

  if (!mediaSession) {
    return () => {};
  }

  try {
    mediaSession.setActionHandler("nexttrack", onNext);
    mediaSession.setActionHandler("previoustrack", onPrevious);
  } catch {
    return () => {};
  }

  return () => {
    try {
      mediaSession.setActionHandler("nexttrack", null);
      mediaSession.setActionHandler("previoustrack", null);
    } catch {
      // Some browsers expose mediaSession but reject clearing handlers.
    }
  };
}

function getMediaSession(): MediaSessionLike | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return "mediaSession" in navigator
    ? (navigator.mediaSession as MediaSessionLike)
    : null;
}
