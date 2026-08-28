// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVoiceAnswer } from "../src/widgets/useVoiceAnswer";

type RecordingHandler = (...args: unknown[]) => void;

const soniox = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock("@soniox/client", () => ({
  MicrophoneSource: class {},
  SonioxClient: class {
    realtime = { record: soniox.record };
  },
}));

describe("useVoiceAnswer", () => {
  beforeEach(() => {
    soniox.record.mockReset();
  });

  it("keeps one recording alive while revealing an answer and changing cards", () => {
    const handlers = new Map<string, RecordingHandler>();
    const recording = {
      state: "recording",
      cancel: vi.fn(),
      on: vi.fn((event: string, handler: RecordingHandler) => {
        handlers.set(event, handler);
        return recording;
      }),
    };
    soniox.record.mockReturnValue(recording);

    const { rerender, unmount } = renderHook(
      ({ accepting, active, answers }) =>
        useVoiceAnswer({
          enabled: true,
          active,
          accepting,
          answers,
          contextTerms: ["세종대왕", "한양"],
          sessionKey: "session-1",
          onMatch: vi.fn(),
        }),
      {
        initialProps: {
          accepting: true,
          active: true,
          answers: [{ id: "answer-1", value: "세종대왕" }],
        },
      },
    );

    expect(soniox.record).toHaveBeenCalledTimes(1);

    act(() => {
      rerender({
        accepting: false,
        active: true,
        answers: [{ id: "answer-1", value: "세종대왕" }],
      });
    });
    act(() => {
      rerender({
        accepting: true,
        active: true,
        answers: [{ id: "answer-2", value: "한양" }],
      });
    });

    expect(soniox.record).toHaveBeenCalledTimes(1);
    expect(recording.cancel).not.toHaveBeenCalled();

    unmount();
    expect(recording.cancel).toHaveBeenCalledTimes(1);
  });
});
