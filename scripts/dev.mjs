import { readFileSync } from "node:fs";
import { parse } from "dotenv";

// Load PORT before the Next.js CLI chooses the development server's port.
try {
  const port = parse(readFileSync(".env")).PORT;
  if (port !== undefined) process.env.PORT ??= port;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

process.argv.splice(2, 0, "dev");
await import("next/dist/bin/next");
