import { describe, expect, it } from "vitest";

import { PinAttemptLimiter } from "../src/services/pinAttemptLimiter";

describe("PinAttemptLimiter", () => {
  it("counts failures inside the attempt window", () => {
    const limiter = new PinAttemptLimiter(2, 60_000);

    expect(limiter.recordFailure("client", 0)).toBe(0);
    expect(limiter.recordFailure("client", 1)).toBe(60);
    expect(limiter.retryAfterSeconds("client", 30_000)).toBe(31);
  });

  it("forgets failures after the attempt window", () => {
    const limiter = new PinAttemptLimiter(2, 1_000);

    expect(limiter.recordFailure("client", 0)).toBe(0);
    expect(limiter.recordFailure("client", 1_001)).toBe(0);
  });

  it("clears failures after a successful unlock", () => {
    const limiter = new PinAttemptLimiter(2, 60_000);

    expect(limiter.recordFailure("client", 0)).toBe(0);
    limiter.reset("client");
    expect(limiter.recordFailure("client", 1)).toBe(0);
  });
});
