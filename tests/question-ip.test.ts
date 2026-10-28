import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import Database from "better-sqlite3";
import { getClientIp } from "../src/lib/client-ip";
import { getClientKey } from "../src/lib/rate-limit";

test("question IPs and rate limits share the trusted proxy boundary", () => {
  const originalTrust = process.env.TRUST_PROXY;
  const originalSecret = process.env.BETTER_AUTH_SECRET;
  try {
    process.env.BETTER_AUTH_SECRET = "test-secret-".repeat(4);
    const ipv4 = new Headers({ "X-Real-IP": "198.51.100.23" });
    const ipv6 = new Headers({ "X-Real-IP": "2001:db8::23" });
    for (const trust of [undefined, "false", "TRUE"]) {
      if (trust === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = trust;
      assert.equal(getClientIp(ipv4), null);
      assert.equal(getClientIp(ipv6), null);
      assert.equal(getClientKey(ipv4), getClientKey(new Headers()));
    }

    process.env.TRUST_PROXY = "true";
    assert.equal(getClientIp(ipv4), "198.51.100.23");
    assert.equal(getClientIp(ipv6), "2001:db8::23");
    assert.notEqual(getClientKey(ipv4), getClientKey(ipv6));
    for (const value of ["", "unknown", "198.51.100.23, 192.0.2.1", "192.0.2.1:3000", "[::1]"]) {
      const headers = new Headers({ "X-Real-IP": value, "X-Forwarded-For": "192.0.2.1" });
      assert.equal(getClientIp(headers), null);
      assert.equal(getClientKey(headers), getClientKey(new Headers()));
    }
    assert.equal(getClientIp(new Headers({ "X-Forwarded-For": "192.0.2.1" })), null);
  } finally {
    if (originalTrust === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = originalTrust;
    if (originalSecret === undefined) delete process.env.BETTER_AUTH_SECRET;
    else process.env.BETTER_AUTH_SECRET = originalSecret;
  }
});

test("init migration allows questions without recorded IPs", () => {
  const database = new Database(":memory:");
  try {
    database.exec(
      readFileSync(
        new URL("../prisma/migrations/20261028185858_init/migration.sql", import.meta.url),
        "utf8",
      ),
    );
    database.exec(
      `INSERT INTO "Question" (id, content, answer, status, updatedAt)
       VALUES ('existing', '기존 질문', '기존 답변', 'PUBLISHED', CURRENT_TIMESTAMP)`,
    );
    assert.deepEqual(
      database.prepare('SELECT content, answer, status, ipAddress FROM "Question"').get(),
      { content: "기존 질문", answer: "기존 답변", status: "PUBLISHED", ipAddress: null },
    );
  } finally {
    database.close();
  }
});
