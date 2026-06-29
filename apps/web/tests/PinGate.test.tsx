// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PinGate } from "../src/components/PinGate";

describe("PinGate", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows setup screen when no PIN is configured", async () => {
    mockFetch([{ pinConfigured: false, unlocked: false }]);

    render(
      <PinGate>
        <div>Private content</div>
      </PinGate>,
    );

    expect(await screen.findByRole("heading", { name: "Set PIN" })).toBeTruthy();
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("renders children when already unlocked", async () => {
    mockFetch([{ pinConfigured: true, unlocked: true }]);

    render(
      <PinGate>
        <div>Private content</div>
      </PinGate>,
    );

    expect(await screen.findByText("Private content")).toBeTruthy();
  });

  it("returns to the lock screen when the app emits a lock event", async () => {
    mockFetch([{ pinConfigured: true, unlocked: true }]);

    render(
      <PinGate>
        <div>Private content</div>
      </PinGate>,
    );

    expect(await screen.findByText("Private content")).toBeTruthy();
    window.dispatchEvent(new Event("inq:locked"));

    expect(await screen.findByRole("heading", { name: "Unlock" })).toBeTruthy();
    expect(screen.queryByText("Private content")).toBeNull();
  });

  it("unlocks with PIN and then renders children", async () => {
    const user = userEvent.setup();
    mockFetch([
      { pinConfigured: true, unlocked: false },
      { unlocked: true, expiresAt: "2026-06-23T00:00:00.000Z" },
    ]);

    render(
      <PinGate>
        <div>Private content</div>
      </PinGate>,
    );

    await user.type(await screen.findByLabelText("PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => {
      expect(screen.getByText("Private content")).toBeTruthy();
    });
  });

  it("shows an error when setting the first PIN fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pinConfigured: false, unlocked: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "pin_already_configured" }), {
          status: 409,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PinGate>
        <div>Private content</div>
      </PinGate>,
    );

    await user.type(await screen.findByLabelText("PIN"), "1234");
    await user.type(screen.getByLabelText("Confirm PIN"), "1234");
    await user.click(screen.getByRole("button", { name: "Set PIN" }));

    expect(await screen.findByText("PIN을 설정하지 못했습니다.")).toBeTruthy();
    expect(screen.queryByText("Private content")).toBeNull();
  });
});

function mockFetch(responses: unknown[]) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }

  vi.stubGlobal("fetch", fetchMock);
}
