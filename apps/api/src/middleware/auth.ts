import { getSignedCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";

import type { PrismaClient } from "@inq/db";
import type { ApiEnv } from "../env";
import { isSessionValid, type PinSessionPayload } from "../services/authService";

export const SESSION_COOKIE_NAME = "inq_session";

export function authMiddleware(options: {
  prisma: PrismaClient;
  env: Pick<ApiEnv, "sessionSecret">;
}): MiddlewareHandler {
  return async (context, next) => {
    const cookieValue = await getSignedCookie(
      context,
      options.env.sessionSecret,
      SESSION_COOKIE_NAME,
    );

    if (!cookieValue || !(await isSessionValid(options.prisma, parseSession(cookieValue)))) {
      return context.json({ error: "unauthorized" }, 401);
    }

    await next();
  };
}

function parseSession(cookieValue: string): PinSessionPayload {
  try {
    return JSON.parse(cookieValue) as PinSessionPayload;
  } catch {
    return { createdAt: "", expiresAt: "" };
  }
}
