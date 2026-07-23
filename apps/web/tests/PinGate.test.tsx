// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "./test-utils";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PinGate } from "../src/features/auth/PinGate";

describe("PinGate", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows lock screen even if the status reports no configured PIN", async () => {
    mockFetch([{ pinConfigured: false, unlocked: false }]);

    render(
      <PinGate>
        <div>Private content</div>
      </PinGate>,
    );

    expect(
      await screen.findByRole("heading", { name: "잠금 해제" }),
    ).toBeTruthy();
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

    expect(
      await screen.findByRole("heading", { name: "잠금 해제" }),
    ).toBeTruthy();
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
    await user.click(screen.getByRole("button", { name: "열기" }));

    await waitFor(() => {
      expect(screen.getByText("Private content")).toBeTruthy();
    });
  });

  it("shows an error when unlocking fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pinConfigured: true, unlocked: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_pin" }), {
          status: 401,
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
    await user.click(screen.getByRole("button", { name: "열기" }));

    expect(await screen.findByText("PIN을 확인해 주세요.")).toBeTruthy();
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
