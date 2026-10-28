import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse } from "dotenv";

const exists = existsSync(".env");
const contents = readFileSync(exists ? ".env" : ".env.example", "utf8");

if (!exists || !parse(contents).BETTER_AUTH_SECRET?.trim()) {
  const secret = randomBytes(48).toString("base64url");
  // Match dotenv assignments, including export, comments, and quoted multiline values.
  const assignment =
    /^([ \t]*(?:export[ \t]+)?([\w.-]+)[ \t]*=[ \t]*)(?:"(?:\\.|[^"\\])*"|'[^']*'|`[^`]*`|[^\r\n#]*)([ \t]*(?:#[^\r\n]*)?)/gm;
  let updated = contents.replace(
    assignment,
    (match, prefix: string, key: string, comment: string) =>
      key === "BETTER_AUTH_SECRET" ? `${prefix}"${secret}"${comment}` : match,
  );
  if (updated === contents) {
    const newline = contents.includes("\r\n") ? "\r\n" : "\n";
    updated += `${contents && !contents.endsWith("\n") ? newline : ""}BETTER_AUTH_SECRET="${secret}"${newline}`;
  }
  writeFileSync(".env", updated, { mode: 0o600 });
  chmodSync(".env", 0o600);
  console.log(
    exists
      ? "Added a random authentication secret to the existing .env."
      : "Created .env with a random authentication secret.",
  );
} else {
  console.log("Keeping the existing .env and authentication secret.");
}

mkdirSync("data", { recursive: true });
mkdirSync("backups", { recursive: true });
