import { isVehicleControlEnabled } from "./vehicleControlSettings";

type MediaSessionAction =
  | "nexttrack"
  | "previoustrack"
  | "play"
  | "pause";

type MediaSessionLike = {
  metadata: MediaMetadata | null;
  setActionHandler: (
    action: MediaSessionAction,
    handler: (() => void) | null,
  ) => void;
};

type MediaSessionHandlers = {
  onNext: () => void;
  onPrevious: () => void;
};

export type VehicleControlStatus =
  | "preparing"
  | "ready"
  | "disabled"
  | "unsupported"
  | "failed";

type DeckMediaSessionControllerOptions = MediaSessionHandlers & {
  deckTitle: string;
  currentIndex: number;
  totalCards: number;
  onStatusChange: (status: VehicleControlStatus) => void;
};

type ManagedSilentAudio = {
  element: HTMLAudioElement;
  objectUrl: string;
};

let primedAudio: ManagedSilentAudio | null = null;

export function primeDeckVehicleControlFromUserGesture() {
  if (!isVehicleControlEnabled() || !getMediaSession()) {
    return;
  }

  releasePrimedDeckVehicleControl();

  try {
    primedAudio = createSilentAudio();
    void primedAudio.element.play().catch(() => {
      // The runner reports the blocked state and exposes a retry action.
    });
  } catch {
    primedAudio = null;
  }
}

export function releasePrimedDeckVehicleControl() {
  if (!primedAudio) {
    return;
  }

  disposeSilentAudio(primedAudio);
  primedAudio = null;
}

export class DeckMediaSessionController {
  private audio: ManagedSilentAudio | null = null;
  private disposed = false;
  private options: DeckMediaSessionControllerOptions;

  constructor(options: DeckMediaSessionControllerOptions) {
    this.options = options;
  }

  async prepare() {
    if (this.disposed) {
      return;
    }

    const mediaSession = getMediaSession();

    if (!mediaSession || typeof MediaMetadata === "undefined") {
      releasePrimedDeckVehicleControl();
      this.options.onStatusChange("unsupported");
      return;
    }

    this.suspend(false);
    this.options.onStatusChange("preparing");

    try {
      this.audio = takePrimedAudio() ?? createSilentAudio();
      attachActionHandlers(mediaSession, this.options);
      this.updateMetadata(
        this.options.deckTitle,
        this.options.currentIndex,
        this.options.totalCards,
      );
      await this.audio.element.play();

      if (!this.disposed && this.audio) {
        this.options.onStatusChange("ready");
      }
    } catch {
      this.suspend(false);

      if (!this.disposed) {
        this.options.onStatusChange("failed");
      }
    }
  }

  updateHandlers(handlers: MediaSessionHandlers) {
    this.options = { ...this.options, ...handlers };

    const mediaSession = getMediaSession();

    if (mediaSession && this.audio) {
      try {
        attachActionHandlers(mediaSession, this.options);
      } catch {
        this.suspend(false);
        this.options.onStatusChange("failed");
      }
    }
  }

  updateMetadata(deckTitle: string, currentIndex: number, totalCards: number) {
    this.options = {
      ...this.options,
      deckTitle,
      currentIndex,
      totalCards,
    };

    const mediaSession = getMediaSession();

    if (!mediaSession || typeof MediaMetadata === "undefined") {
      return;
    }

    mediaSession.metadata = new MediaMetadata({
      title: deckTitle,
      artist: `${Math.min(currentIndex + 1, totalCards)} / ${totalCards}`,
      album: "inq",
    });
  }

  suspend(reportPreparing = true) {
    clearActionHandlers();

    if (this.audio) {
      disposeSilentAudio(this.audio);
      this.audio = null;
    }

    if (!this.disposed && reportPreparing) {
      this.options.onStatusChange("preparing");
    }
  }

  destroy() {
    this.disposed = true;
    this.suspend(false);
  }
}

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

function attachActionHandlers(
  mediaSession: MediaSessionLike,
  handlers: MediaSessionHandlers,
) {
  mediaSession.setActionHandler("nexttrack", handlers.onNext);
  mediaSession.setActionHandler("previoustrack", handlers.onPrevious);
  mediaSession.setActionHandler("play", noOp);
  mediaSession.setActionHandler("pause", noOp);
}

function clearActionHandlers() {
  const mediaSession = getMediaSession();

  if (!mediaSession) {
    return;
  }

  for (const action of [
    "nexttrack",
    "previoustrack",
    "play",
    "pause",
  ] as const) {
    try {
      mediaSession.setActionHandler(action, null);
    } catch {
      // Some browsers expose an action but reject clearing it.
    }
  }

  mediaSession.metadata = null;
}

function createSilentAudio(): ManagedSilentAudio {
  if (
    typeof document === "undefined" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("Local audio is unavailable");
  }

  const objectUrl = URL.createObjectURL(createSilentWavBlob());
  const element = document.createElement("audio");
  element.src = objectUrl;
  element.loop = true;
  element.preload = "auto";
  element.hidden = true;
  element.setAttribute("playsinline", "");
  document.body.append(element);

  return { element, objectUrl };
}

function createSilentWavBlob() {
  const sampleRate = 8_000;
  const sampleCount = sampleRate;
  const buffer = new ArrayBuffer(44 + sampleCount);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount, true);

  new Uint8Array(buffer, 44).fill(128);

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function takePrimedAudio() {
  const audio = primedAudio;
  primedAudio = null;
  return audio;
}

function disposeSilentAudio(audio: ManagedSilentAudio) {
  audio.element.pause();
  audio.element.removeAttribute("src");
  audio.element.load();
  audio.element.remove();
  URL.revokeObjectURL(audio.objectUrl);
}

function noOp() {}

function getMediaSession(): MediaSessionLike | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return "mediaSession" in navigator
    ? (navigator.mediaSession as MediaSessionLike)
    : null;
}
