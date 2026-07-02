import { closeSync, openSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

if (!databaseUrl.startsWith("file:")) {
  process.exit(0);
}

const databasePath = toDatabasePath(databaseUrl);

await mkdir(dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, "a"));

function toDatabasePath(url) {
  const withoutScheme = url.slice("file:".length).split(/[?#]/, 1)[0];

  if (withoutScheme.startsWith("//")) {
    return new URL(url).pathname;
  }

  return resolve(process.cwd(), withoutScheme);
}
