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

    await user.type(screen.getByLabelText("Current PIN"), "1234");
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm New PIN"), "5678");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

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
    expect(await screen.findByText("Saved")).toBeTruthy();
  });

  it("clears the saved state when editing PIN fields after a change", async () => {
    const user = userEvent.setup();
    mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.type(screen.getByLabelText("Current PIN"), "1234");
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm New PIN"), "5678");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));
    expect(await screen.findByText("Saved")).toBeTruthy();

    await user.type(screen.getByLabelText("New PIN"), "9");

    expect(screen.queryByText("Saved")).toBeNull();
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

    await user.type(screen.getByLabelText("Current PIN"), "1234");
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm New PIN"), "5678");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

    expect(await screen.findByText("PIN을 변경하지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("disables PIN change when confirmation does not match", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchByPath({
      "/api/auth/change-pin": { ok: true },
      "/api/backup/export": { exportedAt: "2026-06-25T00:00:00.000Z" },
      "/api/auth/lock": { ok: true },
    });

    renderSettings();

    await user.type(screen.getByLabelText("Current PIN"), "1234");
    await user.type(screen.getByLabelText("New PIN"), "5678");
    await user.type(screen.getByLabelText("Confirm New PIN"), "9999");

    const changeButton = screen.getByRole("button", { name: "Change PIN" });
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

    await user.click(screen.getByRole("button", { name: "Export backup" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backup/export",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(await screen.findByText("Backup ready")).toBeTruthy();
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

    await user.click(screen.getByRole("button", { name: "Export backup" }));

    expect(await screen.findByText("백업을 내보내지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("Backup ready")).toBeNull();
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

    await user.click(screen.getByRole("button", { name: "Lock" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/lock",
      expect.objectContaining({ method: "POST" }),
    );
    expect(lockListener).toHaveBeenCalledTimes(1);
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
