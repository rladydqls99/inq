import { MicrophoneSource, SonioxClient, type Recording } from "@soniox/client";
import { useEffect, useRef, useState } from "react";

import { apiRequest } from "@/shared/api/client";
import { matchingVoiceAnswerIds } from "./voiceAnswerMatch";

type VoiceAnswerState =
  | { status: "listening"; transcript: string }
  | { status: "wrong"; transcript: string }
  | { status: "error"; message: string };

export function useVoiceAnswer({
  enabled,
  answers,
  active,
  accepting,
  contextTerms,
  sessionKey,
  onMatch,
}: {
  enabled: boolean;
  answers: { id: string; value: string }[];
  active: boolean;
  accepting: boolean;
  contextTerms: string[];
  sessionKey: string;
  onMatch: (answerIds: string[]) => void;
}) {
  const [state, setState] = useState<VoiceAnswerState | null>(null);
  const onMatchRef = useRef(onMatch);
  const answersRef = useRef(answers);
  const acceptingRef = useRef(accepting);
  const contextTermsRef = useRef(contextTerms);
  const finalTranscriptRef = useRef("");
  const recordingRef = useRef<Recording | null>(null);
  onMatchRef.current = onMatch;
  answersRef.current = answers;
  acceptingRef.current = accepting;
  contextTermsRef.current = contextTerms;

  useEffect(() => {
    finalTranscriptRef.current = "";
    setState(
      accepting && recordingRef.current?.state === "recording"
        ? { status: "listening", transcript: "" }
        : null,
    );
  }, [accepting, answers]);

  const hasContextTerms = contextTerms.length > 0;

  useEffect(() => {
    if (!enabled || !active || !hasContextTerms) {
      setState(null);
      return;
    }

    let recording: Recording | null = null;
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
      endpoint_latency_adjustment_level: 2,
      endpoint_sensitivity: 0.3,
      max_endpoint_delay_ms: 1000,
      context: { terms: contextTermsRef.current },
      source: new MicrophoneSource({
        constraints: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      }),
    });
    recordingRef.current = recording;
    recording.on("connected", () => {
      if (!closed && acceptingRef.current) {
        setState({ status: "listening", transcript: "" });
      }
    });
    recording.on("result", (result) => {
      if (!acceptingRef.current) {
        finalTranscriptRef.current = "";
        return;
      }

      finalTranscriptRef.current += result.tokens
        .filter((token) => token.is_final)
        .map((token) => token.text)
        .join("");
    });
    recording.on("endpoint", () => {
      const transcript = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (!transcript || closed || !acceptingRef.current) return;

      const answerIds = matchingVoiceAnswerIds(transcript, answersRef.current);
      if (answerIds.length > 0) {
        setState({ status: "listening", transcript });
        onMatchRef.current(answerIds);
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
      if (recordingRef.current === recording) {
        recordingRef.current = null;
      }
      finalTranscriptRef.current = "";
    };
  }, [active, enabled, hasContextTerms, sessionKey]);

  return state;
}
