import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import type { PrismaClient } from "@inq/db";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

export type PinSessionPayload = {
  createdAt: string;
  expiresAt: string;
};

export async function setupFirstPin(prisma: PrismaClient, pin: string) {
  const existing = await prisma.pinSettings.findFirst();

  if (existing) {
    return { ok: false as const, reason: "pin_already_exists" as const };
  }

  await prisma.pinSettings.create({
    data: {
      pinHash: await hashPin(pin),
      sessionsInvalidatedAt: new Date(),
    },
  });

  return { ok: true as const };
}

export async function verifyPin(prisma: PrismaClient, pin: string) {
  const settings = await prisma.pinSettings.findFirst();

  if (!settings) {
    return { ok: false as const, reason: "pin_not_configured" as const };
  }

  if (!(await comparePin(pin, settings.pinHash))) {
    return { ok: false as const, reason: "invalid_pin" as const };
  }

  return { ok: true as const, settings };
}

export async function changePin(
  prisma: PrismaClient,
  input: {
    currentPin: string;
    nextPin: string;
    nextPinConfirm: string;
  },
) {
  if (input.nextPin !== input.nextPinConfirm) {
    return { ok: false as const, reason: "pin_confirmation_mismatch" as const };
  }

  const current = await verifyPin(prisma, input.currentPin);

  if (!current.ok) {
    return { ok: false as const, reason: current.reason };
  }

  await prisma.pinSettings.update({
    where: { id: current.settings.id },
    data: {
      pinHash: await hashPin(input.nextPin),
      sessionsInvalidatedAt: new Date(),
    },
  });

  return { ok: true as const };
}

export async function invalidateSessions(prisma: PrismaClient) {
  const settings = await prisma.pinSettings.findFirst();

  if (!settings) {
    return;
  }

  await prisma.pinSettings.update({
    where: { id: settings.id },
    data: { sessionsInvalidatedAt: new Date() },
  });
}

export function createSessionPayload(input: {
  now: Date;
  ttlSeconds: number;
}): PinSessionPayload {
  const expiresAt = new Date(input.now.getTime() + input.ttlSeconds * 1000);

  return {
    createdAt: input.now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function isSessionValid(
  prisma: PrismaClient,
  payload: PinSessionPayload,
  now = new Date(),
) {
  const createdAt = new Date(payload.createdAt);
  const expiresAt = new Date(payload.expiresAt);

  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  if (expiresAt.getTime() <= now.getTime()) {
    return false;
  }

  const settings = await prisma.pinSettings.findFirst();

  if (!settings) {
    return false;
  }

  return createdAt.getTime() > settings.sessionsInvalidatedAt.getTime();
}

async function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(pin, salt, KEY_LENGTH)) as Buffer;

  return `${HASH_PREFIX}:${salt}:${key.toString("hex")}`;
}

async function comparePin(pin: string, storedHash: string) {
  const [prefix, salt, hash] = storedHash.split(":");

  if (prefix !== HASH_PREFIX || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = (await scrypt(pin, salt, expected.length)) as Buffer;

  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}
