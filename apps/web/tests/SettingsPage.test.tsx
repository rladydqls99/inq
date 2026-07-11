// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "../src/features/settings/SettingsPage";

describe("SettingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("changes PIN from the settings screen", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.type(screen.getByLabelText("현재 PIN"), "1234");
    await user.type(screen.getByLabelText("새 PIN"), "5678");
    await user.type(screen.getByLabelText("새 PIN 확인"), "5678");
    await user.click(screen.getByRole("button", { name: "PIN 변경" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/change-pin",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          currentPin: "1234",
          nextPin: "5678",
          nextPinConfirm: "5678",
        }),
      }),
    );
    expect(await screen.findByText("저장되었습니다.")).toBeTruthy();
  });

  it("clears the saved state when editing PIN fields after a change", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.type(screen.getByLabelText("현재 PIN"), "1234");
    await user.type(screen.getByLabelText("새 PIN"), "5678");
    await user.type(screen.getByLabelText("새 PIN 확인"), "5678");
    await user.click(screen.getByRole("button", { name: "PIN 변경" }));
    expect(await screen.findByText("저장되었습니다.")).toBeTruthy();

    await user.type(screen.getByLabelText("새 PIN"), "9");

    expect(screen.queryByText("저장되었습니다.")).toBeNull();
  });

  it("shows an error when PIN change fails", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/change-pin": {
        body: { error: "invalid_current_pin" },
        status: 400,
      },
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.type(screen.getByLabelText("현재 PIN"), "1234");
    await user.type(screen.getByLabelText("새 PIN"), "5678");
    await user.type(screen.getByLabelText("새 PIN 확인"), "5678");
    await user.click(screen.getByRole("button", { name: "PIN 변경" }));

    expect(await screen.findByText("PIN을 변경하지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("저장되었습니다.")).toBeNull();
  });

  it("disables PIN change when confirmation does not match", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.type(screen.getByLabelText("현재 PIN"), "1234");
    await user.type(screen.getByLabelText("새 PIN"), "5678");
    await user.type(screen.getByLabelText("새 PIN 확인"), "9999");

    const changeButton = screen.getByRole("button", { name: "PIN 변경" });
    expect(changeButton).toHaveProperty("disabled", true);
    expect(screen.getByText("PIN이 일치하지 않습니다.")).toBeTruthy();

    await user.click(changeButton);
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/auth/change-pin",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("exports backup data", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const fetchMock = mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
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
      "/api/auth/change-pin": { ok: true },
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

  it("locks the app and emits the lock event", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
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
      "/api/auth/change-pin": { ok: true },
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
