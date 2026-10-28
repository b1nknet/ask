import "dotenv/config";
import Database from "better-sqlite3";
import { chmodSync } from "node:fs";
import { getDatabasePath } from "../src/lib/env";

const file = getDatabasePath();
const database = new Database(file);
try {
  database.pragma("journal_mode = WAL");
  chmodSync(file, 0o600);
  console.log("SQLite ready (WAL mode).");
} finally {
  database.close();
}
