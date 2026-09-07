// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "../src/shared/api/client";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("locks the app when an authenticated request returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const locked = vi.fn();
    window.addEventListener("inq:locked", locked);

    await expect(apiRequest("/decks/deck-1")).rejects.toMatchObject({
      status: 401,
    });
    expect(locked).toHaveBeenCalledTimes(1);

    window.removeEventListener("inq:locked", locked);
  });

  it("does not lock the app for other API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "failed" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const locked = vi.fn();
    window.addEventListener("inq:locked", locked);

    await expect(apiRequest("/decks/deck-1")).rejects.toMatchObject({
      status: 500,
    });
    expect(locked).not.toHaveBeenCalled();

    window.removeEventListener("inq:locked", locked);
  });

  it("does not emit a second lock event for auth endpoint failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          }),
        ),
      ),
    );
    const locked = vi.fn();
    window.addEventListener("inq:locked", locked);

    await expect(apiRequest("/auth/lock")).rejects.toMatchObject({
      status: 401,
    });
    expect(locked).not.toHaveBeenCalled();

    window.removeEventListener("inq:locked", locked);
  });
});
