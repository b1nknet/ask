import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

test("setup generates a secret for new, missing, and empty settings without changing other values", () => {
  const script = fileURLToPath(new URL("../scripts/setup.ts", import.meta.url));
  const settings =
    'DATABASE_URL="file:./custom.db"\n# keep this comment\nCUSTOM="value"\nMULTILINE="example:\nBETTER_AUTH_SECRET=not-an-assignment\n"\n';
  for (const assignment of [
    undefined,
    "",
    'BETTER_AUTH_SECRET=""\n',
    "BETTER_AUTH_SECRET=\n",
    "export BETTER_AUTH_SECRET = '   ' # keep secret comment\n",
    'BETTER_AUTH_SECRET="\n  \n"\n',
  ]) {
    const directory = mkdtempSync(path.join(tmpdir(), "ask-setup-"));
    try {
      const envFile = path.join(directory, ".env");
      writeFileSync(path.join(directory, ".env.example"), settings + 'BETTER_AUTH_SECRET=""\n');
      if (assignment !== undefined) writeFileSync(envFile, settings + assignment);
      const run = () =>
        spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), script], {
          cwd: directory,
          encoding: "utf8",
          timeout: 10_000,
        });
      const result = run();
      assert.equal(result.status, 0, result.stderr);
      const contents = readFileSync(envFile, "utf8");
      const secret = parse(contents).BETTER_AUTH_SECRET;
      assert.match(secret, /^[A-Za-z0-9_-]{64}$/);
      assert.ok(contents.startsWith(settings));
      if (assignment?.includes("# keep secret comment")) {
        assert.ok(contents.includes("# keep secret comment"));
      }
      assert.equal(statSync(envFile).mode & 0o777, 0o600);
      assert.equal(result.stdout.includes(secret), false);
      assert.equal(run().status, 0);
      assert.equal(readFileSync(envFile, "utf8"), contents);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("setup preserves an existing authentication secret and the rest of .env exactly", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ask-setup-"));
  const contents = `# existing configuration\r\nBETTER_AUTH_SECRET='${"s".repeat(48)}'\r\nCUSTOM=value`;
  try {
    const envFile = path.join(directory, ".env");
    writeFileSync(envFile, contents);
    const script = fileURLToPath(new URL("../scripts/setup.ts", import.meta.url));
    const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), script], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(envFile, "utf8"), contents);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("initialization rejects missing and empty migration sources", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ask-migrations-"));
  const script = fileURLToPath(new URL("../scripts/check-migrations.ts", import.meta.url));
  const check = () =>
    spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), script], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10_000,
    });
  try {
    assert.equal(check().status, 1);
    const migrations = path.join(directory, "prisma/migrations");
    mkdirSync(migrations, { recursive: true });
    assert.equal(check().status, 1);
    const migration = path.join(migrations, "init");
    mkdirSync(migration);
    assert.equal(check().status, 1);
    writeFileSync(path.join(migration, "migration.sql"), "");
    const empty = check();
    assert.equal(empty.status, 1);
    assert.match(empty.stderr, /prisma\/migrations.*npm run setup/);
    writeFileSync(path.join(migration, "migration.sql"), "CREATE TABLE Example (id TEXT);");
    assert.equal(check().status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
