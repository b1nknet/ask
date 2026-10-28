import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const target = ".next/standalone";
if (existsSync("public")) cpSync("public", join(target, "public"), { recursive: true });
cpSync(".next/static", join(target, ".next/static"), { recursive: true });

// Next may trace local env files. Supply secrets at runtime instead.
for (const entry of readdirSync(target)) {
  if (entry === ".env" || entry.startsWith(".env.")) rmSync(join(target, entry));
}
