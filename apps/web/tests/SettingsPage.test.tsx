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

function mockFetchByPath(responsesByPath: Record<string, unknown>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const path = typeof input === "string" ? input : input.toString();
    const response = responsesByPath[path] ?? {};

    return Promise.resolve(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
