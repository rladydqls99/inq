import { Hono } from "hono";

import type { PrismaClient } from "@inq/db";
import { exportBackup } from "../services/backupService";

export function createBackupRoutes(options: { prisma: PrismaClient }) {
  const route = new Hono();

  route.get("/export", async (context) => {
    return context.json(await exportBackup(options.prisma));
  });

  return route;
}
