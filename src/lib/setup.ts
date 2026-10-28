import "server-only";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";
import { getDatabasePath } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { getPrisma } from "@/lib/prisma";

export async function hasAdmin() {
  return (await getPrisma().user.findFirst({ select: { id: true } })) !== null;
}

export async function createFirstAdmin(username: string, password: string) {
  const hash = await hashPassword(password);
  const database = new Database(getDatabasePath(), { fileMustExist: true, timeout: 5000 });
  try {
    // Lock before checking: concurrent requests must not provision a second administrator.
    // Keep both inserts synchronous in the same SQLite transaction, rolling back together.
    database
      .transaction(() => {
        if (database.prepare('SELECT 1 FROM "User" LIMIT 1').get()) {
          throw new HttpError(409, "이미 관리자 계정이 있어요. 로그인해 주세요.");
        }
        const id = randomUUID();
        const now = new Date().toISOString();
        database
          .prepare(
            'INSERT INTO "User" (id, name, username, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?)',
          )
          .run(id, username, username, `${randomUUID()}@ask.invalid`, now, now);
        database
          .prepare(
            'INSERT INTO "Account" (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .run(randomUUID(), id, "credential", id, hash, now, now);
      })
      .immediate();
  } finally {
    database.close();
  }
}
