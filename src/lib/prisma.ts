import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let client: PrismaClient | undefined;

export function getPrisma() {
  if (!client) {
    client =
      globalForPrisma.prisma ??
      new PrismaClient({
        adapter: new PrismaBetterSqlite3({ url: getDatabaseUrl(), timeout: 5000 }),
      });

    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  }

  return client;
}
