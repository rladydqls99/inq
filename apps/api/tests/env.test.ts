import { describe, expect, it } from "vitest";

import { loadEnv } from "../src/env";

describe("loadEnv", () => {
  it("rejects blank production session secrets", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "production",
        SESSION_SECRET: "   ",
      }),
    ).toThrow("SESSION_SECRET is required");
  });

  it("falls back to the default PIN session TTL for invalid values", () => {
    expect(
      loadEnv({
        SESSION_SECRET: "test-secret",
        PIN_SESSION_TTL_SECONDS: "not-a-number",
      }).pinSessionTtlSeconds,
    ).toBe(86400);
    expect(
      loadEnv({
        SESSION_SECRET: "test-secret",
        PIN_SESSION_TTL_SECONDS: "0",
      }).pinSessionTtlSeconds,
    ).toBe(86400);
  });

  it("uses INITIAL_PIN and falls back to 0000", () => {
    expect(
      loadEnv({
        SESSION_SECRET: "test-secret",
        INITIAL_PIN: "2468",
      }).initialPin,
    ).toBe("2468");
    expect(loadEnv({ SESSION_SECRET: "test-secret" }).initialPin).toBe("0000");
    expect(
      loadEnv({
        SESSION_SECRET: "test-secret",
        INITIAL_PIN: "   ",
      }).initialPin,
    ).toBe("0000");
  });
});
