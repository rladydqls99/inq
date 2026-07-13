import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { Hono, type Context } from "hono";

import type { PrismaClient } from "@inq/db";
import type { ApiEnv } from "../env";
import { SESSION_COOKIE_NAME } from "../middleware/auth";
import {
  changePin,
  createSessionPayload,
  ensureInitialPin,
  invalidateSessions,
  isSessionValid,
  setupFirstPin,
  verifyPin,
  type PinSessionPayload,
} from "../services/authService";
import { PinAttemptLimiter } from "../services/pinAttemptLimiter";

const DEFAULT_PIN_MAX_ATTEMPTS = 10;
const DEFAULT_PIN_LOCKOUT_SECONDS = 5 * 60;

export function createAuthRoutes(options: {
  prisma: PrismaClient;
  env: ApiEnv;
}) {
  const route = new Hono();
  const pinAttemptLimiter = new PinAttemptLimiter(
    options.env.pinMaxAttempts ?? DEFAULT_PIN_MAX_ATTEMPTS,
    (options.env.pinLockoutSeconds ?? DEFAULT_PIN_LOCKOUT_SECONDS) * 1000,
  );

  route.get("/status", async (context) => {
    const settings = await ensureInitialPin(
      options.prisma,
      options.env.initialPin || "0000",
    );
    const cookieValue = await getSignedCookie(
      context,
      options.env.sessionSecret,
      SESSION_COOKIE_NAME,
    );
    const unlocked =
      typeof cookieValue === "string" &&
      (await isSessionValid(options.prisma, parseSession(cookieValue)));

    return context.json({
      pinConfigured: Boolean(settings),
      unlocked,
    });
  });

  route.post("/setup-pin", async (context) => {
    if (options.env.secureCookies) {
      await ensureInitialPin(options.prisma, options.env.initialPin);
    }

    const body = await context.req.json();
    const pin = trimmedString(readField(body, "pin"));

    if (!pin) {
      return context.json({ error: "pin_required" }, 400);
    }

    const result = await setupFirstPin(options.prisma, pin);

    if (!result.ok) {
      return context.json({ error: result.reason }, 409);
    }

    return context.json({ ok: true }, 201);
  });

  route.post("/unlock", async (context) => {
    const clientKey = readClientKey(context);
    const retryAfterSeconds = pinAttemptLimiter.retryAfterSeconds(clientKey);

    if (retryAfterSeconds > 0) {
      return rateLimited(context, retryAfterSeconds);
    }

    const body = await context.req.json();
    const pin = trimmedString(readField(body, "pin"));

    if (!pin) {
      return context.json({ error: "pin_required" }, 400);
    }

    const result = await verifyPin(options.prisma, pin);

    if (!result.ok) {
      const lockoutSeconds = pinAttemptLimiter.recordFailure(clientKey);

      if (lockoutSeconds > 0) {
        return rateLimited(context, lockoutSeconds);
      }

      return context.json({ error: result.reason }, 401);
    }

    pinAttemptLimiter.reset(clientKey);

    const payload = createSessionPayload({
      now: new Date(),
      ttlSeconds: options.env.pinSessionTtlSeconds,
    });

    await setSignedCookie(
      context,
      SESSION_COOKIE_NAME,
      JSON.stringify(payload),
      options.env.sessionSecret,
      {
        httpOnly: true,
        sameSite: "Lax",
        secure: options.env.secureCookies,
        path: "/",
        expires: new Date(payload.expiresAt),
      },
    );

    return context.json({
      unlocked: true,
      expiresAt: payload.expiresAt,
    });
  });

  route.post("/change-pin", async (context) => {
    const authorized = await hasActiveSession(
      context,
      options.prisma,
      options.env,
    );

    if (!authorized) {
      return context.json({ error: "unauthorized" }, 401);
    }

    const body = await context.req.json();
    const currentPin = trimmedString(readField(body, "currentPin"));
    const nextPin = trimmedString(readField(body, "nextPin"));
    const nextPinConfirm = trimmedString(readField(body, "nextPinConfirm"));

    if (!currentPin || !nextPin || !nextPinConfirm) {
      return context.json({ error: "pin_fields_required" }, 400);
    }

    const result = await changePin(options.prisma, {
      currentPin,
      nextPin,
      nextPinConfirm,
    });

    if (!result.ok) {
      return context.json({ error: result.reason }, 400);
    }

    deleteCookie(context, SESSION_COOKIE_NAME, {
      path: "/",
      secure: options.env.secureCookies,
    });

    return context.json({ ok: true });
  });

  route.post("/lock", async (context) => {
    const authorized = await hasActiveSession(
      context,
      options.prisma,
      options.env,
    );

    if (!authorized) {
      return context.json({ error: "unauthorized" }, 401);
    }

    await invalidateSessions(options.prisma);
    deleteCookie(context, SESSION_COOKIE_NAME, {
      path: "/",
      secure: options.env.secureCookies,
    });

    return context.json({ ok: true });
  });

  return route;
}

async function hasActiveSession(
  context: Context,
  prisma: PrismaClient,
  env: ApiEnv,
) {
  const cookieValue = await getSignedCookie(
    context,
    env.sessionSecret,
    SESSION_COOKIE_NAME,
  );

  return (
    typeof cookieValue === "string" &&
    (await isSessionValid(prisma, parseSession(cookieValue)))
  );
}

function parseSession(cookieValue: string): PinSessionPayload {
  try {
    return JSON.parse(cookieValue) as PinSessionPayload;
  } catch {
    return { createdAt: "", expiresAt: "" };
  }
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readField(value: unknown, field: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return (value as Record<string, unknown>)[field];
}

function readClientKey(context: Context): string {
  const forwardedFor = context.req.header("x-forwarded-for");
  const firstForwardedAddress = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedAddress ||
    context.req.header("x-real-ip")?.trim() ||
    "unknown"
  );
}

function rateLimited(context: Context, retryAfterSeconds: number) {
  context.header("Retry-After", String(retryAfterSeconds));
  return context.json({ error: "too_many_attempts" }, 429);
}
