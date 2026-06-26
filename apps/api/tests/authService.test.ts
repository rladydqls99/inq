import { describe, expect, it } from "vitest";

import { isSessionValid } from "../src/services/authService";
import { createTestPrisma } from "./testUtils";

describe("isSessionValid", () => {
  it("rejects sessions created at the invalidation boundary", async () => {
    const { prisma, cleanup } = await createTestPrisma();

    try {
      const invalidatedAt = new Date("2026-06-26T00:00:00.000Z");
      await prisma.pinSettings.create({
        data: {
          pinHash: "test",
          sessionsInvalidatedAt: invalidatedAt,
        },
      });

      await expect(
        isSessionValid(
          prisma,
          {
            createdAt: invalidatedAt.toISOString(),
            expiresAt: "2026-06-26T00:01:00.000Z",
          },
          invalidatedAt,
        ),
      ).resolves.toBe(false);
    } finally {
      await cleanup();
    }
  });
});
