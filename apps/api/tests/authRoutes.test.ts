import { describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { createTestPrisma } from "./testUtils";

describe("auth routes", () => {
  it("bootstraps the initial PIN from env during status checks", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({
        prisma,
        env: {
          sessionSecret: "test-secret",
          pinSessionTtlSeconds: 60,
          initialPin: "2468",
        },
      });

      const statusResponse = await app.request("/api/auth/status");
      expect(statusResponse.status).toBe(200);
      await expect(statusResponse.json()).resolves.toMatchObject({
        pinConfigured: true,
        unlocked: false,
      });

      await expect(prisma.pinSettings.count()).resolves.toBe(1);

      const unlockResponse = await app.request("/api/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ pin: "2468" }),
        headers: { "content-type": "application/json" },
      });
      expect(unlockResponse.status).toBe(200);
    } finally {
      await cleanup();
    }
  });

  it("uses 0000 as the default initial PIN", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const app = createApp({
        prisma,
        env: {
          sessionSecret: "test-secret",
          pinSessionTtlSeconds: 60,
          initialPin: "0000",
        },
      });

      await app.request("/api/auth/status");
      const unlockResponse = await app.request("/api/auth/unlock", {
        method: "POST",
        body: JSON.stringify({ pin: "0000" }),
        headers: { "content-type": "application/json" },
      });

      expect(unlockResponse.status).toBe(200);
    } finally {
      await cleanup();
    }
  });
});
