import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Hono } from "hono";

import { createPrismaClient } from "@inq/db";

const testDirname = dirname(fileURLToPath(import.meta.url));
const testEnv = {
  sessionSecret: "test-secret",
  pinSessionTtlSeconds: 60,
};

export async function createTestPrisma() {
  const directory = mkdtempSync(join(tmpdir(), "inq-api-test-"));
  const databasePath = join(directory, "test.db");
  const migrationSql = readFileSync(
    join(
      testDirname,
      "../../../packages/db/prisma/migrations/20260622135735_init/migration.sql",
    ),
    "utf8",
  );

  execFileSync("sqlite3", [databasePath], {
    input: migrationSql,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const prisma = createPrismaClient(`file:${databasePath}`);

  return {
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export async function unlockTestApp(app: Hono): Promise<string> {
  const setupResponse = await app.request("/api/auth/setup-pin", {
    method: "POST",
    body: JSON.stringify({ pin: "1234" }),
    headers: { "content-type": "application/json" },
  });
  if (setupResponse.status !== 201) {
    throw new Error(`PIN setup failed with status ${setupResponse.status}`);
  }

  const unlockResponse = await app.request("/api/auth/unlock", {
    method: "POST",
    body: JSON.stringify({ pin: "1234" }),
    headers: { "content-type": "application/json" },
  });
  const cookie = unlockResponse.headers.get("set-cookie");

  if (unlockResponse.status !== 200 || !cookie) {
    throw new Error(`PIN unlock failed with status ${unlockResponse.status}`);
  }

  return cookie;
}

export { testEnv };
