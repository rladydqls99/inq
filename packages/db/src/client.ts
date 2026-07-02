import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Prisma } from "./generated/prisma/client";

export function createPrismaClient(
  databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db",
) {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();

export { PrismaClient };
export type { Prisma };
