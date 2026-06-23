import { Hono } from "hono";

import { prisma as defaultPrisma, type PrismaClient } from "@inq/db";
import { loadEnv, type ApiEnv } from "./env";
import { authMiddleware } from "./middleware/auth";
import { createAuthRoutes } from "./routes/auth";

export function createApp(options?: {
  prisma?: PrismaClient;
  env?: ApiEnv;
}) {
  const app = new Hono();
  const prisma = options?.prisma ?? defaultPrisma;
  const env = options?.env ?? loadEnv();

  app.get("/api/health", (context) => {
    return context.json({ ok: true });
  });

  app.route("/api/auth", createAuthRoutes({ prisma, env }));

  return app;
}

export const app = createApp();
