// @vitest-environment jsdom

import { cleanup, render, screen } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "../src/pages/settings/SettingsPage";
import { DECK_PROMPT_SPEECH_STORAGE_KEY } from "../src/widgets/deckPromptSpeechSettings";
import { VEHICLE_CONTROL_STORAGE_KEY } from "../src/widgets/vehicleControlSettings";
import { VOICE_ANSWER_STORAGE_KEY } from "../src/widgets/voiceAnswerSettings";
import { THEME_STORAGE_KEY } from "../src/shared/lib/theme";

describe("SettingsPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it("does not show PIN controls in settings", () => {
    renderSettings();

    expect(screen.queryByRole("heading", { name: "PIN" })).toBeNull();
    expect(screen.queryByRole("button", { name: "PIN 변경" })).toBeNull();
  });

  it("enables vehicle control by default and persists changes on this device", async () => {
    const user = userEvent.setup();

    renderSettings();

    const vehicleControl = screen.getByRole("switch", {
      name: /학습 차량 제어/,
    }) as HTMLInputElement;
    expect(vehicleControl.checked).toBe(true);
    expect(window.localStorage.getItem(VEHICLE_CONTROL_STORAGE_KEY)).toBeNull();

    await user.click(vehicleControl);

    expect(vehicleControl.checked).toBe(false);
    expect(window.localStorage.getItem(VEHICLE_CONTROL_STORAGE_KEY)).toBe(
      "false",
    );

    cleanup();
    renderSettings();
    expect(
      (
        screen.getByRole("switch", {
          name: /학습 차량 제어/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
  });

  it("keeps voice answer checking off until enabled on this device", async () => {
    const user = userEvent.setup();
    renderSettings();

    const voiceAnswer = screen.getByRole("switch", {
      name: /음성으로 정답 확인/,
    }) as HTMLInputElement;
    expect(voiceAnswer.checked).toBe(false);

    await user.click(voiceAnswer);

    expect(voiceAnswer.checked).toBe(true);
    expect(window.localStorage.getItem(VOICE_ANSWER_STORAGE_KEY)).toBe("true");
  });

  it("keeps automatic deck speech off until enabled on this device", async () => {
    const user = userEvent.setup();
    renderSettings();

    const deckPromptSpeech = screen.getByRole("switch", {
      name: /덱 문제 자동 읽기/,
    }) as HTMLInputElement;
    expect(deckPromptSpeech.checked).toBe(false);

    await user.click(deckPromptSpeech);

    expect(deckPromptSpeech.checked).toBe(true);
    expect(window.localStorage.getItem(DECK_PROMPT_SPEECH_STORAGE_KEY)).toBe(
      "true",
    );
  });

  it("uses dark mode by default and persists the selected theme", async () => {
    const user = userEvent.setup();
    renderSettings();

    expect(
      (screen.getByRole("radio", { name: "다크" }) as HTMLInputElement).checked,
    ).toBe(true);

    await user.click(screen.getByRole("radio", { name: "라이트" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    await user.click(screen.getByRole("radio", { name: "다크" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("exports backup data", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const fetchMock = mockFetchByPath({
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.click(screen.getByRole("button", { name: "백업 내보내기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backup/export",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(await screen.findByText("백업 파일이 준비되었습니다.")).toBeTruthy();
  });

  it("shows an error when backup export fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/backup/export": {
        body: { error: "backup_failed" },
        status: 500,
      },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.click(screen.getByRole("button", { name: "백업 내보내기" }));

    expect(await screen.findByText("백업을 내보내지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("백업 파일이 준비되었습니다.")).toBeNull();
  });

  it("prevents duplicate backup exports while one is in progress", async () => {
    const user = userEvent.setup();
    let resolveRequest!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderSettings();

    const button = screen.getByRole("button", { name: "백업 내보내기" });
    await user.click(button);

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.textContent).toBe("내보내는 중");

    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest(
      new Response(JSON.stringify({ exportedAt: "2026-06-25T00:00:00.000Z" }), {
        headers: { "content-type": "application/json" },
      }),
    );

    expect(await screen.findByText("백업 파일이 준비되었습니다.")).toBeTruthy();
  });

  it("locks the app and emits the lock event", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });
    const lockListener = vi.fn();
    window.addEventListener("inq:locked", lockListener);

    renderSettings();

    await user.click(screen.getByRole("button", { name: "잠그기" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/lock",
      expect.objectContaining({ method: "POST" }),
    );
    expect(lockListener).toHaveBeenCalledTimes(1);
    window.removeEventListener("inq:locked", lockListener);
  });

  it("shows an error and does not emit lock when locking fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": {
        body: { error: "unauthorized" },
        status: 401,
      },
    });
    const lockListener = vi.fn();
    window.addEventListener("inq:locked", lockListener);

    renderSettings();

    await user.click(screen.getByRole("button", { name: "잠그기" }));

    expect(await screen.findByText("잠금 처리에 실패했습니다.")).toBeTruthy();
    expect(lockListener).not.toHaveBeenCalled();
    window.removeEventListener("inq:locked", lockListener);
  });
});

function renderSettings() {
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

type MockResponse = unknown | { body: unknown; status: number };

function mockFetchByPath(responsesByPath: Record<string, MockResponse>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? {};
    const status = isMockErrorResponse(response) ? response.status : 200;
    const body = isMockErrorResponse(response) ? response.body : response;

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function isMockErrorResponse(
  response: MockResponse,
): response is { body: unknown; status: number } {
  return (
    Boolean(response) &&
    typeof response === "object" &&
    response !== null &&
    "body" in response &&
    "status" in response
  );
}
