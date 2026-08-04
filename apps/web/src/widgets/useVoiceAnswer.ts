import { MicrophoneSource, SonioxClient, type Recording } from "@soniox/client";
import { useEffect, useRef, useState } from "react";

import { apiRequest } from "@/shared/api/client";
import { matchesVoiceAnswer } from "./voiceAnswerMatch";

type VoiceAnswerState =
  | { status: "listening"; transcript: string }
  | { status: "wrong"; transcript: string }
  | { status: "error"; message: string };

export function useVoiceAnswer({
  enabled,
  answers,
  active,
  onCorrect,
}: {
  enabled: boolean;
  answers: string[];
  active: boolean;
  onCorrect: () => void;
}) {
  const [state, setState] = useState<VoiceAnswerState | null>(null);
  const onCorrectRef = useRef(onCorrect);
  onCorrectRef.current = onCorrect;

  useEffect(() => {
    if (!enabled || !active || answers.length === 0) {
      setState(null);
      return;
    }

    let recording: Recording | null = null;
    let finalTranscript = "";
    let closed = false;

    const client = new SonioxClient({
      config: async () =>
        apiRequest<{ api_key: string }>("/voice/temporary-key", {
          method: "POST",
        }),
    });
    recording = client.realtime.record({
      model: "stt-rt-v5",
      language_hints: ["ko"],
      language_hints_strict: true,
      enable_endpoint_detection: true,
      max_endpoint_delay_ms: 1000,
      context: { terms: answers },
      source: new MicrophoneSource({
        constraints: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      }),
    });
    recording.on("connected", () => {
      if (!closed) setState({ status: "listening", transcript: "" });
    });
    recording.on("result", (result) => {
      finalTranscript += result.tokens
        .filter((token) => token.is_final)
        .map((token) => token.text)
        .join("");
    });
    recording.on("endpoint", () => {
      const transcript = finalTranscript.trim();
      finalTranscript = "";
      if (!transcript || closed) return;

      if (matchesVoiceAnswer(transcript, answers)) {
        closed = true;
        setState({ status: "listening", transcript });
        recording?.cancel();
        onCorrectRef.current();
        return;
      }

      setState({ status: "wrong", transcript });
    });
    recording.on("error", () => {
      if (!closed) {
        setState({
          status: "error",
          message: "음성 인식을 시작하지 못했습니다. 설정을 확인해 주세요.",
        });
      }
    });
    return () => {
      closed = true;
      recording?.cancel();
    };
  }, [active, answers, enabled]);

  return state;
}
