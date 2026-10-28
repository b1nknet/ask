import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { verifyTurnstile } from "../src/lib/turnstile";
import { HttpError } from "../src/lib/http";
import { POST } from "../src/app/api/questions/route";
import { getPrisma } from "../src/lib/prisma";

const envNames = [
  "TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "TRUST_PROXY",
] as const;
const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
let client = 0;
let restoreCreate: (() => void) | undefined;

beforeEach(() => {
  Object.assign(process.env, {
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET_KEY: "secret-key",
    BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
    BETTER_AUTH_URL: "https://ask.example.com",
    TRUST_PROXY: "true",
  });
});

afterEach(() => {
  restoreCreate?.();
  restoreCreate = undefined;
  mock.restoreAll();
  for (const name of envNames) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

function expectStatus(status: number) {
  return (error: unknown) => error instanceof HttpError && error.status === status;
}

function mockQuestionCreate(implementation: (...args: unknown[]) => Promise<unknown>) {
  // Prisma's delegate is a Proxy, so node:test's descriptor-based mock.method cannot wrap it.
  const delegate = getPrisma().question;
  const original = delegate.create;
  const create = mock.fn(implementation);
  delegate.create = create as typeof delegate.create;
  restoreCreate = () => {
    delegate.create = original;
  };
  return create;
}

function questionRequest(body: unknown) {
  return new Request("https://ask.example.com/api/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://ask.example.com",
      "X-Real-IP": `192.0.2.${++client}`,
    },
    body: JSON.stringify(body),
  });
}

test("Turnstile is optional only when both keys are absent", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("No request should be sent");
  });
  delete process.env.TURNSTILE_SITE_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  await verifyTurnstile(undefined);
  process.env.TURNSTILE_SITE_KEY = "site-key";
  await assert.rejects(verifyTurnstile("token"), expectStatus(503));
  delete process.env.TURNSTILE_SITE_KEY;
  process.env.TURNSTILE_SECRET_KEY = "secret-key";
  await assert.rejects(verifyTurnstile("token"), expectStatus(503));
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("missing, empty, and oversized tokens fail before calling Cloudflare", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("No request should be sent");
  });
  for (const token of [undefined, "", " ", "x".repeat(2049)]) {
    await assert.rejects(verifyTurnstile(token), expectStatus(400));
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("verification posts the secret and token only to Cloudflare with a timeout and no cache", async () => {
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (url: unknown, options?: RequestInit) => {
      assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
      assert.equal(options?.method, "POST");
      assert.equal(options?.cache, "no-store");
      assert.ok(options?.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(String(options?.body)), {
        secret: "secret-key",
        response: "token",
      });
      return Response.json({ success: true, action: "question" });
    },
  );
  await verifyTurnstile("token");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("expired, duplicate, forged, and other-action responses are rejected", async () => {
  for (const result of [
    { success: false, "error-codes": ["timeout-or-duplicate"] },
    { success: false, "error-codes": ["invalid-input-response"] },
    { success: true, action: "login" },
    { success: true },
    { success: "true", action: "question" },
    null,
  ]) {
    mock.method(globalThis, "fetch", async () => Response.json(result));
    await assert.rejects(verifyTurnstile("token"), expectStatus(400));
    mock.restoreAll();
  }
});

test("network failures, timeouts, and invalid Cloudflare responses fail closed", async () => {
  for (const response of [
    async () => {
      throw new TypeError("offline");
    },
    async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
    async () => new Response("unavailable", { status: 503 }),
    async () => new Response("not json"),
  ]) {
    mock.method(globalThis, "fetch", response);
    await assert.rejects(verifyTurnstile("token"), expectStatus(503));
    mock.restoreAll();
  }
});

test("question API cannot save a question without successful verification", async () => {
  const create = mockQuestionCreate(async () => {
    throw new Error("Unverified questions must not reach the database");
  });
  mock.method(globalThis, "fetch", async () => Response.json({ success: false }));
  for (const turnstileToken of [undefined, "forged-token", "x".repeat(2049), 42]) {
    const response = await POST(questionRequest({ content: "question", turnstileToken }));
    assert.equal(response.status, 400);
  }
  assert.equal(create.mock.callCount(), 0);
});

test("question API saves content and trusted IP after verification succeeds", async () => {
  const create = mockQuestionCreate(async () => ({}));
  mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, action: "question" }),
  );
  const response = await POST(
    questionRequest({ content: "  question  ", turnstileToken: "valid-token" }),
  );
  assert.equal(response.status, 201);
  assert.equal(create.mock.callCount(), 1);
  assert.deepEqual(create.mock.calls[0].arguments, [
    { data: { content: "question", ipAddress: "192.0.2.5" } },
  ]);
});
