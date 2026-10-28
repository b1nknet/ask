import "dotenv/config";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { getDatabasePath } from "../src/lib/env";

const destination = resolve(
  process.argv[2] ?? `backups/ask-${new Date().toISOString().replaceAll(":", "-")}.db`,
);
mkdirSync(dirname(destination), { recursive: true });
const database = new Database(getDatabasePath(), { readonly: true, fileMustExist: true });
try {
  await database.backup(destination);
  chmodSync(destination, 0o600);
  console.log(`Backup written to ${destination}`);
} finally {
  database.close();
}
