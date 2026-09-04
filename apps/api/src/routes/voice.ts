import { Hono } from "hono";

import type { ApiEnv } from "../env";

const SONIOX_TEMPORARY_KEY_URL =
  "https://api.soniox.com/v1/auth/temporary-api-key";

type TemporaryKeyUsage = "transcribe_websocket" | "tts_rt";

export function createVoiceRoutes(options: { env: ApiEnv }) {
  const route = new Hono();

  route.post("/temporary-key", async (context) => {
    if (!options.env.sonioxApiKey) {
      return context.json({ error: "voice_not_configured" }, 503);
    }

    try {
      const key = await createTemporaryKey(
        options.env.sonioxApiKey,
        "transcribe_websocket",
        60 * 30,
      );

      return context.json({
        api_key: key.api_key,
        ...(typeof key.expires_at === "string"
          ? { expires_at: key.expires_at }
          : {}),
      });
    } catch {
      return context.json({ error: "voice_unavailable" }, 502);
    }
  });

  route.post("/tts-temporary-key", async (context) => {
    if (!options.env.sonioxApiKey) {
      return context.json({ error: "voice_not_configured" }, 503);
    }

    try {
      const key = await createTemporaryKey(
        options.env.sonioxApiKey,
        "tts_rt",
        60 * 5,
      );

      return context.json({
        api_key: key.api_key,
        ...(typeof key.expires_at === "string"
          ? { expires_at: key.expires_at }
          : {}),
      });
    } catch {
      return context.json({ error: "voice_unavailable" }, 502);
    }
  });

  return route;
}

async function createTemporaryKey(
  apiKey: string,
  usageType: TemporaryKeyUsage,
  maxSessionDurationSeconds: number,
) {
  const response = await fetch(SONIOX_TEMPORARY_KEY_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      usage_type: usageType,
      expires_in_seconds: 60,
      single_use: true,
      max_session_duration_seconds: maxSessionDurationSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error("Soniox temporary key request failed");
  }

  const key = (await response.json()) as {
    api_key?: unknown;
    expires_at?: unknown;
  };
  if (typeof key.api_key !== "string") {
    throw new Error("Soniox temporary key response was invalid");
  }

  return key as { api_key: string; expires_at?: unknown };
}
