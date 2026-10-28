import path from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL ?? "file:./data/ask.db";
if (!url.startsWith("file:")) throw new Error("DATABASE_URL must point to a local SQLite file.");
const file = url.startsWith("file://") ? fileURLToPath(url) : path.resolve(url.slice(5));
process.env.DATABASE_URL = `file:${file}`;
process.env.HOSTNAME ||= "127.0.0.1";
await import("../.next/standalone/server.js");
