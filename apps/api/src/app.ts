import { Hono } from "hono";

import { prisma as defaultPrisma, type PrismaClient } from "@inq/db";
import { loadEnv, type ApiEnv } from "./env";
import { authMiddleware } from "./middleware/auth";
import { createAuthRoutes } from "./routes/auth";
import { createCardRoutes } from "./routes/cards";
import { createChallengeRoutes } from "./routes/challenges";
import { createDeckRoutes } from "./routes/decks";

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
  app.use("/api/decks", authMiddleware({ prisma, env }));
  app.use("/api/decks/*", authMiddleware({ prisma, env }));
  app.use("/api/cards/*", authMiddleware({ prisma, env }));
  app.use("/api/challenges", authMiddleware({ prisma, env }));
  app.use("/api/challenges/*", authMiddleware({ prisma, env }));
  app.route("/api/decks", createDeckRoutes({ prisma }));
  app.route("/api", createCardRoutes({ prisma }));
  app.route("/api/challenges", createChallengeRoutes({ prisma }));

  return app;
}

export const app = createApp();
