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

export function createAuthRoutes(options: {
  prisma: PrismaClient;
  env: ApiEnv;
}) {
  const route = new Hono();

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
    const body = await context.req.json();
    const pin = trimmedString(readField(body, "pin"));

    if (!pin) {
      return context.json({ error: "pin_required" }, 400);
    }

    const result = await verifyPin(options.prisma, pin);

    if (!result.ok) {
      return context.json({ error: result.reason }, 401);
    }

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

    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });

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
    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });

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
