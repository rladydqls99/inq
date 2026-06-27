import { Hono } from "hono";

import { prisma as defaultPrisma, type PrismaClient } from "@inq/db";
import { loadEnv, type ApiEnv } from "./env";
import { authMiddleware } from "./middleware/auth";
import { createAuthRoutes } from "./routes/auth";
import { createBackupRoutes } from "./routes/backup";
import { createCardRoutes } from "./routes/cards";
import { createChallengeRoutes } from "./routes/challenges";
import { createDeckRunRoutes } from "./routes/deckRuns";
import { createDeckRoutes } from "./routes/decks";
import { createImportRoutes } from "./routes/imports";

export function createApp(options?: {
  prisma?: PrismaClient;
  env?: ApiEnv;
}) {
  const app = new Hono();
  const prisma = options?.prisma ?? defaultPrisma;
  const env = options?.env ?? loadEnv();

  app.onError((error, context) => {
    if (error instanceof SyntaxError) {
      return context.json({ error: "invalid_json" }, 400);
    }

    throw error;
  });

  app.get("/api/health", (context) => {
    return context.json({ ok: true });
  });

  app.route("/api/auth", createAuthRoutes({ prisma, env }));
  app.use("/api/decks", authMiddleware({ prisma, env }));
  app.use("/api/decks/*", authMiddleware({ prisma, env }));
  app.use("/api/cards/*", authMiddleware({ prisma, env }));
  app.use("/api/challenges", authMiddleware({ prisma, env }));
  app.use("/api/challenges/*", authMiddleware({ prisma, env }));
  app.use("/api/import/*", authMiddleware({ prisma, env }));
  app.use("/api/imports/*", authMiddleware({ prisma, env }));
  app.use("/api/backup/*", authMiddleware({ prisma, env }));
  app.route("/api/decks", createDeckRoutes({ prisma }));
  app.route("/api/decks", createDeckRunRoutes({ prisma }));
  app.route("/api", createCardRoutes({ prisma }));
  app.route("/api/challenges", createChallengeRoutes({ prisma }));
  app.route("/api/import", createImportRoutes({ prisma }));
  app.route("/api/imports", createImportRoutes({ prisma }));
  app.route("/api/backup", createBackupRoutes({ prisma }));

  return app;
}

export const app = createApp();
