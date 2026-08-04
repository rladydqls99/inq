import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PrismaClient } from "@inq/db";
import { createApp } from "../src/app";
import { createTestPrisma, testEnv, unlockTestApp } from "./testUtils";

let prisma: PrismaClient;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const testDatabase = await createTestPrisma();
  prisma = testDatabase.prisma;
  cleanup = testDatabase.cleanup;
});

afterEach(async () => cleanup());

describe("voice routes", () => {
  it("requires authentication and does not issue a key without configuration", async () => {
    const app = createApp({ prisma, env: testEnv });

    expect(
      (await app.request("/api/voice/temporary-key", { method: "POST" }))
        .status,
    ).toBe(401);

    const cookie = await unlockTestApp(app);
    const response = await app.request("/api/voice/temporary-key", {
      method: "POST",
      headers: { cookie },
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "voice_not_configured",
    });
  });
});
