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
