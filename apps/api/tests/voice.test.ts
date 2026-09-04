import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

afterEach(async () => {
  vi.unstubAllGlobals();
  await cleanup();
});

describe("voice routes", () => {
  it("requires authentication and does not issue a key without configuration", async () => {
    const app = createApp({ prisma, env: testEnv });

    expect(
      (await app.request("/api/voice/temporary-key", { method: "POST" }))
        .status,
    ).toBe(401);

    const cookie = await unlockTestApp(app);
    const [response, ttsResponse] = await Promise.all([
      app.request("/api/voice/temporary-key", {
        method: "POST",
        headers: { cookie },
      }),
      app.request("/api/voice/tts-temporary-key", {
        method: "POST",
        headers: { cookie },
      }),
    ]);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "voice_not_configured",
    });
    expect(ttsResponse.status).toBe(503);
    await expect(ttsResponse.json()).resolves.toEqual({
      error: "voice_not_configured",
    });
  });

  it("issues a single-use temporary key scoped to TTS", async () => {
    const sonioxFetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            api_key: "temporary-tts-key",
            expires_at: "2026-09-04T00:01:00.000Z",
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", sonioxFetch);
    const app = createApp({
      prisma,
      env: { ...testEnv, sonioxApiKey: "server-api-key" },
    });
    const cookie = await unlockTestApp(app);

    const response = await app.request("/api/voice/tts-temporary-key", {
      method: "POST",
      headers: { cookie },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      api_key: "temporary-tts-key",
      expires_at: "2026-09-04T00:01:00.000Z",
    });
    expect(sonioxFetch).toHaveBeenCalledWith(
      "https://api.soniox.com/v1/auth/temporary-api-key",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          usage_type: "tts_rt",
          expires_in_seconds: 60,
          single_use: true,
          max_session_duration_seconds: 60 * 5,
        }),
      }),
    );
  });
});
