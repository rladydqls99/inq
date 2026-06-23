import { deleteCookie, setSignedCookie } from "hono/cookie";
import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import type { ApiEnv } from "../env";
import { SESSION_COOKIE_NAME } from "../middleware/auth";
import {
  changePin,
  createSessionPayload,
  invalidateSessions,
  setupFirstPin,
  verifyPin,
} from "../services/authService";

export function createAuthRoutes(options: {
  prisma: PrismaClient;
  env: ApiEnv;
}) {
  const route = new Hono();

  route.post("/setup-pin", async (context) => {
    const body = await context.req.json<{ pin?: string }>();

    if (!body.pin) {
      return context.json({ error: "pin_required" }, 400);
    }

    const result = await setupFirstPin(options.prisma, body.pin);

    if (!result.ok) {
      return context.json({ error: result.reason }, 409);
    }

    return context.json({ ok: true }, 201);
  });

  route.post("/unlock", async (context) => {
    const body = await context.req.json<{ pin?: string }>();

    if (!body.pin) {
      return context.json({ error: "pin_required" }, 400);
    }

    const result = await verifyPin(options.prisma, body.pin);

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
    const body = await context.req.json<{
      currentPin?: string;
      nextPin?: string;
      nextPinConfirm?: string;
    }>();

    if (!body.currentPin || !body.nextPin || !body.nextPinConfirm) {
      return context.json({ error: "pin_fields_required" }, 400);
    }

    const result = await changePin(options.prisma, {
      currentPin: body.currentPin,
      nextPin: body.nextPin,
      nextPinConfirm: body.nextPinConfirm,
    });

    if (!result.ok) {
      return context.json({ error: result.reason }, 400);
    }

    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });

    return context.json({ ok: true });
  });

  route.post("/lock", async (context) => {
    await invalidateSessions(options.prisma);
    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });

    return context.json({ ok: true });
  });

  return route;
}
