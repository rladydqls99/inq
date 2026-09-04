import { SonioxClient } from "@soniox/client";
import { useEffect, useMemo, useState } from "react";

import { getSpokenPromptText, type QuizSegment } from "@inq/shared";
import { apiRequest } from "@/shared/api/client";
import { isDeckPromptSpeechEnabled } from "./deckPromptSpeechSettings";

type DeckPromptSpeechState =
  | { status: "loading" }
  | { status: "playing" }
  | { status: "error"; message: string };

type WebkitAudioWindow = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

const client = new SonioxClient({
  config: async () =>
    apiRequest<{ api_key: string }>("/voice/tts-temporary-key", {
      method: "POST",
    }),
});

let audioContext: AudioContext | null = null;
const TTS_SAMPLE_RATE = 24_000;
const PLAYBACK_LEAD_SECONDS = 0.08;

export function primeDeckPromptSpeechFromUserGesture() {
  if (!isDeckPromptSpeechEnabled()) return;
  void unlockAudioContext();
}

export async function releaseDeckPromptSpeechAudio() {
  const context = audioContext;
  audioContext = null;
  if (context?.state !== "closed") await context?.close().catch(() => {});
}

export function useDeckPromptSpeech({
  enabled,
  active,
  cardId,
  segments,
}: {
  enabled: boolean;
  active: boolean;
  cardId?: string | undefined;
  segments?: QuizSegment[] | undefined;
}) {
  const [state, setState] = useState<DeckPromptSpeechState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const spokenText = useMemo(
    () => (segments ? getSpokenPromptText(segments) : ""),
    [segments],
  );

  useEffect(() => {
    if (!enabled || !active || !cardId || !spokenText) {
      setState(null);
      return;
    }

    const abortController = new AbortController();
    const sources = new Set<AudioBufferSourceNode>();
    let closed = false;
    let streamEnded = false;

    function stop() {
      abortController.abort();

      for (const source of sources) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          // The source may already have ended.
        }
        source.disconnect();
      }
      sources.clear();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "hidden") return;
      closed = true;
      stop();
      setState(null);
    }

    setState({ status: "loading" });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void (async () => {
      const context = await getRunningAudioContext();
      const audioStream = client.tts.generateStream({
        model: "tts-rt-v2",
        language: "ko",
        voice: "Kayla",
        audio_format: "pcm_s16le",
        sample_rate: TTS_SAMPLE_RATE,
        text: spokenText,
        signal: abortController.signal,
      });
      let pendingByte: number | null = null;
      let nextStartTime = 0;
      let started = false;

      for await (const chunk of audioStream) {
        if (closed) return;

        const pcm = completePcmSamples(chunk, pendingByte);
        pendingByte = pcm.pendingByte;
        if (pcm.bytes.byteLength === 0) continue;

        const buffer = decodePcmS16Le(context, pcm.bytes);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        sources.add(source);
        source.onended = () => {
          source.disconnect();
          sources.delete(source);
          if (!closed && streamEnded && sources.size === 0) setState(null);
        };

        const startTime = Math.max(
          nextStartTime,
          context.currentTime + (started ? 0.01 : PLAYBACK_LEAD_SECONDS),
        );
        source.start(startTime);
        nextStartTime = startTime + buffer.duration;

        if (!started) {
          started = true;
          setState({ status: "playing" });
        }
      }

      streamEnded = true;
      if (!started) throw new Error("Soniox returned no audio");
      if (sources.size === 0) setState(null);
    })().catch((error: unknown) => {
      if (closed || abortController.signal.aborted) return;
      setState({
        status: "error",
        message:
          error instanceof Error && error.name === "NotAllowedError"
            ? "자동 음성 재생이 차단되었습니다."
            : "문제 음성을 재생하지 못했습니다.",
      });
    });

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stop();
    };
  }, [active, attempt, cardId, enabled, spokenText]);

  return {
    state,
    retry() {
      void unlockAudioContext();
      setAttempt((current) => current + 1);
    },
  };
}

async function unlockAudioContext() {
  try {
    const context = getAudioContext();
    if (context.state !== "running") await context.resume();

    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(context.destination);
    source.onended = () => source.disconnect();
    source.start();
  } catch {
    // The runner reports a playback error and offers a user-gesture retry.
  }
}

async function getRunningAudioContext() {
  const context = getAudioContext();
  if (context.state !== "running") await context.resume();
  return context;
}

function getAudioContext(): AudioContext {
  if (audioContext && audioContext.state !== "closed") return audioContext;

  const AudioContextConstructor =
    globalThis.AudioContext ??
    (globalThis as WebkitAudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new Error("Web Audio is unavailable");
  }

  audioContext = new AudioContextConstructor();
  return audioContext;
}

function completePcmSamples(chunk: Uint8Array, pendingByte: number | null) {
  let bytes = chunk;
  if (pendingByte !== null) {
    bytes = new Uint8Array(chunk.byteLength + 1);
    bytes[0] = pendingByte;
    bytes.set(chunk, 1);
  }

  const completeLength = bytes.byteLength - (bytes.byteLength % 2);
  return {
    bytes: bytes.subarray(0, completeLength),
    pendingByte:
      completeLength < bytes.byteLength ? bytes[bytes.byteLength - 1]! : null,
  };
}

function decodePcmS16Le(context: AudioContext, bytes: Uint8Array) {
  const sampleCount = bytes.byteLength / 2;
  const buffer = context.createBuffer(1, sampleCount, TTS_SAMPLE_RATE);
  const samples = buffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = view.getInt16(index * 2, true) / 32_768;
  }

  return buffer;
}
