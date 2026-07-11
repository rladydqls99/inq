import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPrismaClient, type PrismaClient } from "@inq/db";
import { createApp } from "../src/app";
import { authMiddleware } from "../src/middleware/auth";

const testDirname = dirname(fileURLToPath(import.meta.url));
const testEnv = {
  sessionSecret: "test-secret",
  pinSessionTtlSeconds: 60,
  initialPin: "1234",
};

let prisma: PrismaClient;

beforeEach(() => {
  prisma = createPrismaClient(createMigratedDatabaseUrl());
});

afterEach(async () => {
  await prisma?.$disconnect();
});

describe("auth middleware", () => {
  it("returns 401 for unauthenticated protected routes", async () => {
    const app = new Hono();
    app.use(
      "/protected",
      authMiddleware({
        prisma,
        env: testEnv,
      }),
    );
    app.get("/protected", (context) => context.json({ ok: true }));

    const response = await app.request("/protected");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
    });
  });
});

describe("PIN auth routes", () => {
  it("reports PIN configuration and unlock status", async () => {
    const app = createApp({ prisma, env: testEnv });

    const initialResponse = await app.request("/api/auth/status");
    expect(initialResponse.status).toBe(200);
    await expect(initialResponse.json()).resolves.toEqual({
      pinConfigured: true,
      unlocked: false,
    });

    const cookie = await unlockAndGetCookie(app, "1234");
    const unlockedResponse = await app.request("/api/auth/status", {
      headers: { cookie },
    });

    expect(unlockedResponse.status).toBe(200);
    await expect(unlockedResponse.json()).resolves.toEqual({
      pinConfigured: true,
      unlocked: true,
    });
  });

  it("sets up the first PIN when none exists", async () => {
    const app = createProtectedTestApp();

    const response = await app.request("/api/auth/setup-pin", {
      method: "POST",
      body: JSON.stringify({ pin: "1234" }),
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });

    const settings = await prisma.pinSettings.findFirstOrThrow();
    expect(settings.pinHash).not.toBe("1234");
    expect(settings.sessionsInvalidatedAt).toBeInstanceOf(Date);
  });

  it("rejects blank PIN values", async () => {
    const app = createProtectedTestApp();

    const setupResponse = await app.request("/api/auth/setup-pin", {
      method: "POST",
      body: JSON.stringify({ pin: "   " }),
      headers: { "content-type": "application/json" },
    });
    expect(setupResponse.status).toBe(400);
    await expect(setupResponse.json()).resolves.toEqual({
      error: "pin_required",
    });

    await setupPin(app, "1234");

    const unlockResponse = await app.request("/api/auth/unlock", {
      method: "POST",
      body: JSON.stringify({ pin: "   " }),
      headers: { "content-type": "application/json" },
    });
    expect(unlockResponse.status).toBe(400);
    await expect(unlockResponse.json()).resolves.toEqual({
      error: "pin_required",
    });

    const cookie = await unlockAndGetCookie(app, "1234");
    const changeResponse = await app.request("/api/auth/change-pin", {
      method: "POST",
      body: JSON.stringify({
        currentPin: "1234",
        nextPin: "   ",
        nextPinConfirm: "   ",
      }),
      headers: { "content-type": "application/json", cookie },
    });
    expect(changeResponse.status).toBe(400);
    await expect(changeResponse.json()).resolves.toEqual({
      error: "pin_fields_required",
    });
  });

  it("rejects non-string PIN fields", async () => {
    const app = createProtectedTestApp();

    const setupResponse = await app.request("/api/auth/setup-pin", {
      method: "POST",
      body: JSON.stringify({ pin: 123 }),
      headers: { "content-type": "application/json" },
    });
    expect(setupResponse.status).toBe(400);
    await expect(setupResponse.json()).resolves.toEqual({
      error: "pin_required",
    });

    await setupPin(app, "1234");
    const unlockResponse = await app.request("/api/auth/unlock", {
      method: "POST",
      body: JSON.stringify({ pin: 123 }),
      headers: { "content-type": "application/json" },
    });
    expect(unlockResponse.status).toBe(400);
    await expect(unlockResponse.json()).resolves.toEqual({
      error: "pin_required",
    });

    const cookie = await unlockAndGetCookie(app, "1234");
    const changeResponse = await app.request("/api/auth/change-pin", {
      method: "POST",
      body: JSON.stringify({
        currentPin: 123,
        nextPin: "5678",
        nextPinConfirm: "5678",
      }),
      headers: { "content-type": "application/json", cookie },
    });
    expect(changeResponse.status).toBe(400);
    await expect(changeResponse.json()).resolves.toEqual({
      error: "pin_fields_required",
    });
  });

  it("rejects non-object PIN request bodies", async () => {
    const app = createProtectedTestApp();

    const setupResponse = await app.request("/api/auth/setup-pin", {
      method: "POST",
      body: "null",
      headers: { "content-type": "application/json" },
    });
    expect(setupResponse.status).toBe(400);
    await expect(setupResponse.json()).resolves.toEqual({
      error: "pin_required",
    });

    await setupPin(app, "1234");
    const unlockResponse = await app.request("/api/auth/unlock", {
      method: "POST",
      body: "null",
      headers: { "content-type": "application/json" },
    });
    expect(unlockResponse.status).toBe(400);
    await expect(unlockResponse.json()).resolves.toEqual({
      error: "pin_required",
    });

    const cookie = await unlockAndGetCookie(app, "1234");
    const changeResponse = await app.request("/api/auth/change-pin", {
      method: "POST",
      body: "null",
      headers: { "content-type": "application/json", cookie },
    });
    expect(changeResponse.status).toBe(400);
    await expect(changeResponse.json()).resolves.toEqual({
      error: "pin_fields_required",
    });
  });

  it("unlocks with the correct PIN and returns an httpOnly cookie", async () => {
    const app = createProtectedTestApp();
    await setupPin(app, "1234");

    const response = await app.request("/api/auth/unlock", {
      method: "POST",
      body: JSON.stringify({ pin: "1234" }),
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ unlocked: true });
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("inq_session=");
    expect(cookie?.toLowerCase()).toContain("httponly");
  });

  it("changes PIN and invalidates old sessions", async () => {
    const app = createProtectedTestApp();
    await setupPin(app, "1234");
    const oldCookie = await unlockAndGetCookie(app, "1234");

    const beforeChange = await app.request("/api/test/protected", {
      headers: { cookie: oldCookie },
    });
    expect(beforeChange.status).toBe(200);

    const changeResponse = await app.request("/api/auth/change-pin", {
      method: "POST",
      body: JSON.stringify({
        currentPin: "1234",
        nextPin: "5678",
        nextPinConfirm: "5678",
      }),
      headers: {
        "content-type": "application/json",
        cookie: oldCookie,
      },
    });
    expect(changeResponse.status).toBe(200);

    const afterChange = await app.request("/api/test/protected", {
      headers: { cookie: oldCookie },
    });
    expect(afterChange.status).toBe(401);

    const newUnlock = await app.request("/api/auth/unlock", {
      method: "POST",
      body: JSON.stringify({ pin: "5678" }),
      headers: { "content-type": "application/json" },
    });
    expect(newUnlock.status).toBe(200);
  });

  it("rejects PIN changes without an active session", async () => {
    const app = createProtectedTestApp();
    await setupPin(app, "1234");

    const response = await app.request("/api/auth/change-pin", {
      method: "POST",
      body: JSON.stringify({
        currentPin: "1234",
        nextPin: "5678",
        nextPinConfirm: "5678",
      }),
      headers: { "content-type": "application/json" },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
    });
  });

  it("manual lock clears the auth cookie and rejects the old cookie", async () => {
    const app = createProtectedTestApp();
    await setupPin(app, "1234");
    const cookie = await unlockAndGetCookie(app, "1234");

    const lockResponse = await app.request("/api/auth/lock", {
      method: "POST",
      headers: { cookie },
    });

    expect(lockResponse.status).toBe(200);
    expect(lockResponse.headers.get("set-cookie")).toContain(
      "inq_session=;",
    );

    const protectedResponse = await app.request("/api/test/protected", {
      headers: { cookie },
    });
    expect(protectedResponse.status).toBe(401);
  });

  it("rejects manual lock without an active session", async () => {
    const app = createProtectedTestApp();
    await setupPin(app, "1234");

    const response = await app.request("/api/auth/lock", {
      method: "POST",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "unauthorized",
    });
  });
});

async function setupPin(
  app: ReturnType<typeof createApp>,
  pin: string,
): Promise<void> {
  const response = await app.request("/api/auth/setup-pin", {
    method: "POST",
    body: JSON.stringify({ pin }),
    headers: { "content-type": "application/json" },
  });
  expect(response.status).toBe(201);
}

async function unlockAndGetCookie(
  app: ReturnType<typeof createApp>,
  pin: string,
): Promise<string> {
  const response = await app.request("/api/auth/unlock", {
    method: "POST",
    body: JSON.stringify({ pin }),
    headers: { "content-type": "application/json" },
  });
  const cookie = response.headers.get("set-cookie");

  expect(response.status).toBe(200);
  expect(cookie).toBeTruthy();

  return cookie ?? "";
}

function createProtectedTestApp() {
  const app = createApp({ prisma, env: testEnv });

  app.use(
    "/api/test/protected",
    authMiddleware({
      prisma,
      env: testEnv,
    }),
  );
  app.get("/api/test/protected", (context) => context.json({ ok: true }));

  return app;
}

function createMigratedDatabaseUrl(): string {
  const databasePath = join(
    mkdtempSync(join(tmpdir(), "inq-api-auth-test-")),
    "test.db",
  );
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

  return `file:${databasePath}`;
}
