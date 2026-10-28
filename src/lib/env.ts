import path from "node:path";
import { fileURLToPath } from "node:url";

export function getDatabasePath() {
  const url = process.env.DATABASE_URL ?? "file:./data/ask.db";

  if (!url.startsWith("file:") || url === "file:") {
    throw new Error("DATABASE_URL must point to a local SQLite file (file:./data/ask.db).");
  }

  return url.startsWith("file://") ? fileURLToPath(url) : path.resolve(url.slice(5));
}

export function getDatabaseUrl() {
  return `file:${getDatabasePath()}`;
}

export function getAuthSettings() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  if (!secret || secret.length < 32) {
    throw new Error("Set BETTER_AUTH_SECRET to at least 32 random characters. Run npm run setup.");
  }

  const origin = new URL(baseURL).origin;
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_URL) {
    throw new Error("Set BETTER_AUTH_URL to the public origin in production.");
  }

  return { secret, baseURL: origin };
}
