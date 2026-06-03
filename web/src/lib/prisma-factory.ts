import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { normalizePgSslMode } from "@/lib/database-url";

export function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
    ? normalizePgSslMode(process.env.DATABASE_URL)
    : undefined;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  if (url.startsWith("file:")) {
    return new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url }),
    });
  }

  const pool = new Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
