// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "./test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QuizSegment } from "@inq/shared";
import {
  releaseDeckPromptSpeechAudio,
  useDeckPromptSpeech,
} from "../src/widgets/useDeckPromptSpeech";

const soniox = vi.hoisted(() => ({
  generateStream: vi.fn(),
}));

vi.mock("@soniox/client", () => ({
  SonioxClient: class {
    tts = { generateStream: soniox.generateStream };
  },
}));

const firstCard: QuizSegment[] = [
  { type: "text", value: "훈민정음을 만든 조선의 왕은 " },
  { type: "answer", id: "answer-1", value: "세종대왕" },
  { type: "text", value: "이다." },
];

describe("useDeckPromptSpeech", () => {
  let audio: ReturnType<typeof installAudioContext>;

  beforeEach(() => {
    soniox.generateStream.mockReset();
    soniox.generateStream.mockImplementation(async function* () {
      yield new Uint8Array([0, 0, 255, 127]);
    });
    audio = installAudioContext();
  });

  afterEach(async () => {
    cleanup();
    await releaseDeckPromptSpeechAudio();
    vi.unstubAllGlobals();
  });

  it("reads each newly active card once with answer segments replaced", async () => {
    const { rerender } = renderHook(
      (props: { cardId: string; segments: QuizSegment[]; active: boolean }) =>
        useDeckPromptSpeech({
          enabled: true,
          cardId: props.cardId,
          segments: props.segments,
          active: props.active,
        }),
      {
        initialProps: {
          cardId: "card-1",
          segments: firstCard,
          active: true,
        },
      },
    );

    await waitFor(() => expect(soniox.generateStream).toHaveBeenCalledTimes(1));
    expect(soniox.generateStream).toHaveBeenLastCalledWith({
      model: "tts-rt-v2",
      language: "ko",
      voice: "Kayla",
      audio_format: "pcm_s16le",
      sample_rate: 24_000,
      text: "훈민정음을 만든 조선의 왕은 빈칸이다.",
      signal: expect.any(AbortSignal),
    });
    await waitFor(() => expect(audio.sources[0]?.start).toHaveBeenCalled());

    rerender({ cardId: "card-1", segments: firstCard, active: false });
    expect(audio.sources[0]?.stop).toHaveBeenCalledTimes(1);

    rerender({
      cardId: "card-2",
      segments: [
        { type: "text", value: "대한민국의 수도는 " },
        { type: "answer", id: "answer-1", value: "서울" },
        { type: "text", value: "이다." },
      ],
      active: true,
    });

    await waitFor(() => expect(soniox.generateStream).toHaveBeenCalledTimes(2));
    expect(soniox.generateStream.mock.calls[1]?.[0]).toMatchObject({
      text: "대한민국의 수도는 빈칸이다.",
    });
  });

  it("does nothing while the setting is disabled", () => {
    renderHook(() =>
      useDeckPromptSpeech({
        enabled: false,
        active: true,
        cardId: "card-1",
        segments: firstCard,
      }),
    );

    expect(soniox.generateStream).not.toHaveBeenCalled();
  });

  it("offers a retry after generation fails", async () => {
    soniox.generateStream
      .mockImplementationOnce(async function* () {
        yield await Promise.reject(new Error("network"));
      })
      .mockImplementationOnce(async function* () {
        yield new Uint8Array([0, 0]);
      });
    const { result } = renderHook(() =>
      useDeckPromptSpeech({
        enabled: true,
        active: true,
        cardId: "card-1",
        segments: firstCard,
      }),
    );

    await waitFor(() => expect(result.current.state?.status).toBe("error"));
    act(() => result.current.retry());
    await waitFor(() => expect(soniox.generateStream).toHaveBeenCalledTimes(2));
  });
});

function installAudioContext() {
  const sources: Array<{
    buffer: unknown;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];

  class FakeAudioContext {
    state: AudioContextState = "running";
    destination = {};
    sampleRate = 24_000;
    currentTime = 0;
    resume = vi.fn(() => Promise.resolve());
    createBuffer = vi.fn((_channels: number, length: number, rate: number) => ({
      duration: length / rate,
      getChannelData: vi.fn(() => new Float32Array(length)),
    }));
    close = vi.fn(() => {
      this.state = "closed";
      return Promise.resolve();
    });
    createBufferSource = vi.fn(() => {
      const source = {
        buffer: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null,
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    });
  }

  vi.stubGlobal("AudioContext", FakeAudioContext);
  return { sources };
}
