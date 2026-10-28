import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import Database from "better-sqlite3";
import { createAuth } from "../../src/lib/auth-config";
import { getPrisma } from "../../src/lib/prisma";

const directory = mkdtempSync(path.join(tmpdir(), "ask-smoke-"));
// Exercise both sides of the removed 12–128 character password restriction.
const password = "x";
const secondAdminPassword = randomBytes(96).toString("hex");
let server: ChildProcess | undefined;
let origin: string;
let output = "";
let cookie = "";

function command(args: string[], overrides: Record<string, string> = {}) {
  return execFileSync(process.execPath, args, {
    env: { ...process.env, ...overrides },
    encoding: "utf8",
    timeout: 60_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function request(
  url: string,
  method = "GET",
  body?: unknown,
  authenticated = false,
  customHeaders = {},
) {
  return fetch(`${origin}${url}`, {
    method,
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Real-IP": "192.0.2.1",
      ...(authenticated ? { Cookie: cookie } : {}),
      ...customHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(
  async () => {
    const listener = createServer();
    listener.listen(0, "127.0.0.1");
    await once(listener, "listening");
    const address = listener.address();
    assert.ok(address && typeof address !== "string");
    const port = address.port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    origin = `http://127.0.0.1:${port}`;

    Object.assign(process.env, {
      DATABASE_URL: `file:${path.join(directory, "ask.db")}`,
      BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
      BETTER_AUTH_URL: origin,
      ADMIN_EMAIL: "",
      TRUST_PROXY: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",
    });
    delete process.env.ADMIN_USERNAME;
    const uninitialized = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/create-admin.ts", "owner"],
      { env: process.env, encoding: "utf8", timeout: 10_000 },
    );
    assert.equal(uninitialized.status, 1);
    assert.match(uninitialized.stderr, /npm run setup/);
    assert.doesNotMatch(uninitialized.stderr, /Invalid.*prisma/);
    execFileSync("npm", ["run", "setup"], {
      env: process.env,
      encoding: "utf8",
      timeout: 60_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const legacy = await createAuth({ allowSignUp: true }).api.signUpEmail({
      body: { email: "owner@example.com", name: "Former name", password },
    });
    const credential = await getPrisma().account.findFirstOrThrow({
      where: { userId: legacy.user.id, providerId: "credential" },
    });
    await getPrisma().session.create({
      data: {
        id: "legacy-session",
        token: "legacy-token",
        userId: legacy.user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    command(["--import", "tsx", "scripts/create-admin.ts", "owner"], {
      ADMIN_EMAIL: "owner@example.com",
    });
    const owner = await getPrisma().user.findUniqueOrThrow({ where: { username: "owner" } });
    assert.equal(owner.id, legacy.user.id);
    assert.equal(owner.name, "owner");
    assert.match(owner.email, /@ask\.invalid$/);
    assert.equal(await getPrisma().session.count(), 0);
    assert.equal(
      (await getPrisma().account.findUniqueOrThrow({ where: { id: credential.id } })).password,
      credential.password,
    );
    assert.throws(() =>
      command(["--import", "tsx", "scripts/create-admin.ts", "OWNER"], {
        ADMIN_PASSWORD: "replacement",
      }),
    );
    command(["--import", "tsx", "scripts/create-admin.ts", "second_admin"], {
      ADMIN_PASSWORD: secondAdminPassword,
      ADMIN_EMAIL: "deleted-account@example.com",
    });
    assert.match(
      (await getPrisma().user.findUniqueOrThrow({ where: { username: "second_admin" } })).email,
      /@ask\.invalid$/,
    );

    // CLI compatibility is verified above; start the HTTP flow with an empty user table.
    await getPrisma().user.deleteMany();

    server = spawn(process.execPath, ["scripts/start.mjs"], {
      env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout?.on("data", (data) => {
      output += String(data);
    });
    server.stderr?.on("data", (data) => {
      output += String(data);
    });

    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        if ((await request("/api/health")).ok) return;
      } catch {
        /* Server is starting. */
      }
      if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
      await delay(200);
    }
    throw new Error(`Server did not become ready: ${output}`);
  },
  { timeout: 120_000 },
);

after(async () => {
  if (server && server.exitCode === null) {
    const closed = once(server, "exit");
    server.kill("SIGTERM");
    await closed;
  }
  await getPrisma().$disconnect();
  rmSync(directory, { recursive: true, force: true });
});

test("first visit provisions exactly one administrator and closes setup", async () => {
  for (const page of ["/", "/admin", "/admin/login", "/admin/account"]) {
    const response = await request(page);
    assert.equal(response.status, 307, page);
    assert.equal(response.headers.get("location"), "/setup", page);
  }
  const setup = await request("/setup");
  assert.equal(setup.status, 200);
  assert.match(setup.headers.get("cache-control") ?? "", /no-store|private/);
  const html = await setup.text();
  assert.ok(html.includes("관리자 계정 만들기"));
  for (const name of ["username", "password", "confirmPassword"]) {
    assert.ok(html.includes(`name="${name}"`));
  }

  const body = { username: " OwNeR ", password, confirmPassword: password };
  assert.equal(
    (
      await request("/api/auth/sign-up/email", "POST", {
        email: "visitor@example.com",
        name: "Visitor",
        username: "visitor",
        password,
      })
    ).ok,
    false,
  );
  assert.equal(
    (await request("/api/setup", "POST", body, false, { Origin: "https://untrusted.example" }))
      .status,
    403,
  );
  assert.equal((await request("/api/setup", "POST", body, false, { Origin: "" })).status, 403);
  assert.equal(
    (
      await request("/api/setup", "POST", body, false, {
        "Content-Type": "text/plain",
        "X-Real-IP": "192.0.2.30",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await request("/api/setup", "POST", { ...body, password: "x".repeat(20_000) }, false, {
        "X-Real-IP": "192.0.2.31",
      })
    ).status,
    413,
  );
  for (const invalid of [
    { ...body, username: "ab" },
    { ...body, password: "", confirmPassword: "" },
    { ...body, confirmPassword: "wrong" },
    { ...body, confirmPassword: undefined },
    { ...body, username: "owner@example.com" },
  ]) {
    assert.equal(
      (await request("/api/setup", "POST", invalid, false, { "X-Real-IP": "192.0.2.32" })).status,
      400,
    );
  }
  const limited = await request("/api/setup", "POST", body, false, { "X-Real-IP": "192.0.2.32" });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(await getPrisma().user.count(), 0);
  assert.equal(await getPrisma().account.count(), 0);

  const results = await Promise.all([
    request("/api/setup", "POST", body, false, { "X-Real-IP": "192.0.2.33" }),
    request("/api/setup", "POST", { ...body, username: "other_owner" }, false, {
      "X-Real-IP": "192.0.2.34",
    }),
  ]);
  assert.deepEqual(results.map((response) => response.status).sort(), [201, 409]);
  assert.equal(await getPrisma().user.count(), 1);
  assert.equal(await getPrisma().account.count(), 1);
  const owner = await getPrisma().user.findFirstOrThrow();
  assert.ok(["owner", "other_owner"].includes(owner.username ?? ""));
  assert.match(owner.email, /@ask\.invalid$/);
  const login = await request(
    "/api/auth/sign-in/username",
    "POST",
    {
      username: owner.username,
      password,
    },
    false,
    { "X-Real-IP": "192.0.2.35" },
  );
  assert.equal(login.status, 200);
  assert.ok(login.headers.getSetCookie().some((value) => value.includes("session_token")));

  const closed = await request("/setup");
  assert.equal(closed.status, 307);
  assert.equal(closed.headers.get("location"), "/admin/login");
  assert.equal((await request("/api/setup", "POST", body)).status, 409);
  assert.equal(await getPrisma().user.count(), 1);
  assert.equal((await request("/")).status, 200);
  const loginPage = await request("/admin/login?created=1");
  assert.ok((await loginPage.text()).includes("관리자 계정을 만들었어요."));

  // Give subsequent moderation/password tests stable account names.
  if (owner.username !== "owner") {
    await getPrisma().user.update({
      where: { id: owner.id },
      data: { username: "owner", name: "owner" },
    });
  }
  command(["--import", "tsx", "scripts/create-admin.ts", "second_admin"], {
    ADMIN_PASSWORD: secondAdminPassword,
  });
});

test("anonymous inbox enforces authentication, moderation, and privacy", async () => {
  const redirected = await request("/admin");
  assert.equal(redirected.status, 307);
  assert.ok(redirected.headers.get("location")?.includes("/admin/login"));
  const accountRedirect = await request("/admin/account");
  assert.equal(accountRedirect.status, 307);
  assert.ok(accountRedirect.headers.get("location")?.includes("/admin/login"));
  assert.equal(
    (await request("/api/admin/questions/missing", "PATCH", { answer: "x", status: "PUBLISHED" }))
      .status,
    401,
  );
  assert.equal((await request("/api/admin/questions/missing", "DELETE")).status, 401);

  const signup = await request("/api/auth/sign-up/email", "POST", {
    email: "visitor@example.com",
    password,
    name: "Visitor",
    username: "visitor",
  });
  assert.equal(signup.ok, false);
  assert.equal(await getPrisma().user.count(), 2);

  const invalidOrigin = await request("/api/questions", "POST", { content: "Rejected" }, false, {
    Origin: "https://untrusted.example",
  });
  assert.equal(invalidOrigin.status, 403);
  assert.equal((await request("/api/questions", "POST", { content: "  " })).status, 400);
  assert.equal(
    (await request("/api/questions", "POST", { content: "x".repeat(20_000) })).status,
    413,
  );

  const honeypot = await request("/api/questions", "POST", {
    content: "Bot content",
    website: "https://example.com",
  });
  assert.equal(honeypot.status, 201);
  assert.equal(await getPrisma().question.count(), 0);

  const content = `private-question-${randomBytes(12).toString("hex")}`;
  const submitted = await request("/api/questions", "POST", {
    content,
    ipAddress: "203.0.113.99",
  });
  assert.equal(submitted.status, 201);
  assert.deepEqual(await submitted.json(), { success: true });
  const question = await getPrisma().question.findFirstOrThrow({ where: { content } });
  assert.equal(question.status, "PENDING");
  assert.equal(question.ipAddress, "192.0.2.1");
  assert.equal((await (await request("/")).text()).includes(content), false);

  const emailLogin = await request("/api/auth/sign-in/email", "POST", {
    email: "owner@example.com",
    password,
  });
  assert.equal(emailLogin.ok, false);
  assert.equal(emailLogin.headers.getSetCookie().length, 0);

  const wrongPassword = await request("/api/auth/sign-in/username", "POST", {
    username: "owner",
    password: "wrong",
  });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongPassword.headers.getSetCookie().length, 0);

  // Every CLI-created account is an administrator, without a configured username.
  const secondAdmin = await request("/api/auth/sign-in/username", "POST", {
    username: "second_admin",
    password: secondAdminPassword,
  });
  assert.equal(secondAdmin.status, 200);
  const secondAdminCookie = secondAdmin.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.equal(
    (
      await request(
        `/api/admin/questions/${question.id}`,
        "PATCH",
        { answer: "Another administrator’s draft", status: "PENDING" },
        false,
        { Cookie: secondAdminCookie },
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/auth/update-user", "POST", { username: "owner" }, false, {
        Cookie: secondAdminCookie,
      })
    ).ok,
    false,
  );

  const login = await request("/api/auth/sign-in/username", "POST", {
    username: "OwNeR",
    password,
  });
  assert.equal(login.status, 200);
  cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  assert.ok(cookie.includes("session_token"));
  const inbox = await request("/admin", "GET", undefined, true);
  assert.equal(inbox.status, 200);
  const inboxHtml = await inbox.text();
  assert.ok(inboxHtml.includes(content));
  assert.ok(inboxHtml.includes("질문자 IP:"));
  assert.ok(inboxHtml.includes(question.ipAddress));
  assert.match(inbox.headers.get("cache-control") ?? "", /no-store|private/);

  const endpoint = `/api/admin/questions/${question.id}`;
  assert.equal(
    (await request(endpoint, "PATCH", { answer: " ", status: "PUBLISHED" }, true)).status,
    400,
  );
  assert.equal(
    (await request(endpoint, "PATCH", { answer: "draft-only", status: "PENDING" }, true)).status,
    200,
  );
  assert.equal((await (await request("/")).text()).includes("draft-only"), false);
  assert.equal(
    (await request(endpoint, "PATCH", { answer: "공개된 답변입니다", status: "PUBLISHED" }, true))
      .status,
    200,
  );
  const published = await (await request("/")).text();
  assert.ok(published.includes(content));
  assert.ok(published.includes("공개된 답변입니다"));
  for (const response of [
    published,
    await (await request("/", "GET", undefined, true)).text(),
    await (await request("/", "GET", undefined, false, { RSC: "1" })).text(),
  ]) {
    assert.equal(response.includes(question.ipAddress), false);
    assert.equal(response.includes("ipAddress"), false);
    assert.equal(response.includes("질문자 IP:"), false);
  }
  const publishedAdmin = await (
    await request("/admin?status=PUBLISHED", "GET", undefined, true)
  ).text();
  assert.ok(publishedAdmin.includes(question.ipAddress));

  const backupPath = path.join(directory, "backup.db");
  command(["--import", "tsx", "scripts/backup.ts", backupPath]);
  const backup = new Database(backupPath, { readonly: true });
  assert.equal(backup.pragma("integrity_check", { simple: true }), "ok");
  assert.equal(
    (backup.prepare('SELECT count(*) AS count FROM "Question"').get() as { count: number }).count,
    1,
  );
  backup.close();

  assert.equal(
    (await request(endpoint, "PATCH", { answer: "다시 비공개", status: "ARCHIVED" }, true)).status,
    200,
  );
  assert.equal((await (await request("/")).text()).includes(content), false);
  const archivedAdmin = await (
    await request("/admin?status=ARCHIVED", "GET", undefined, true)
  ).text();
  assert.ok(archivedAdmin.includes(question.ipAddress));
  assert.equal((await request(endpoint, "DELETE", undefined, true)).status, 200);
  assert.equal(await getPrisma().question.findUnique({ where: { id: question.id } }), null);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal(
      (await request("/api/questions", "POST", { content: `Another question ${attempt}` })).status,
      201,
    );
  }
  const limited = await request("/api/questions", "POST", { content: "Rate limited" }, false, {
    "X-Forwarded-For": "198.51.100.10",
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);

  const logout = await request("/api/auth/sign-out", "POST", {}, true);
  assert.equal(logout.status, 200);
  assert.equal((await request(endpoint, "DELETE", undefined, true)).status, 401);
});

test("shared answers follow publication changes and expose only public data", async () => {
  const login = await request("/api/auth/sign-in/username", "POST", {
    username: "second_admin",
    password: secondAdminPassword,
  });
  assert.equal(login.status, 200);
  const headers = {
    Cookie: login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
  const content = `공유 질문 ${randomBytes(12).toString("hex")}\n두 번째 줄`;
  const draft = "외부에 공개하면 안 되는 임시 답변";
  const ipAddress = "203.0.113.77";
  const question = await getPrisma().question.create({
    data: { content, answer: draft, ipAddress },
  });
  const sharePath = `/questions/${question.id}`;
  const endpoint = `/api/admin/questions/${question.id}`;
  const answer = "링크로 공유한 답변입니다.\n줄바꿈도 유지해요.";

  async function unavailable(path: string, privateValues: string[]) {
    for (const customHeaders of [
      {},
      headers,
      { "User-Agent": "facebookexternalhit/1.1" },
      { RSC: "1" },
    ]) {
      // Next.js requires the RSC cache discriminator even for an empty header hash.
      const url = "RSC" in customHeaders ? `${path}?_rsc` : path;
      const response = await request(url, "GET", undefined, false, customHeaders);
      const body = await response.text();
      if ("RSC" in customHeaders) {
        // A streamed RSC not-found result can retain HTTP 200 after headers are sent.
        assert.ok([200, 404].includes(response.status));
        assert.match(response.headers.get("content-type") ?? "", /text\/x-component/);
        assert.match(body, /NEXT_HTTP_ERROR_FALLBACK;404/);
      } else {
        assert.equal(response.status, 404);
      }
      for (const value of privateValues) assert.equal(body.includes(value), false);
    }
  }

  await unavailable("/questions/missing", []);
  await unavailable(sharePath, [content.split("\n")[0], draft, ipAddress]);
  const published = await request(
    endpoint,
    "PATCH",
    { answer, status: "PUBLISHED" },
    false,
    headers,
  );
  assert.equal(published.status, 200);
  assert.deepEqual(await published.json(), { success: true, sharePath });

  assert.ok((await (await request("/")).text()).includes(`href="${sharePath}"`));
  const admin = await (
    await request("/admin?status=PUBLISHED", "GET", undefined, false, headers)
  ).text();
  assert.ok(admin.includes(`href="${sharePath}"`));
  assert.ok(admin.includes("링크 복사"));

  for (const customHeaders of [
    {},
    headers,
    { "User-Agent": "facebookexternalhit/1.1", "X-Forwarded-Host": "untrusted.example" },
    { RSC: "1" },
  ]) {
    const url = "RSC" in customHeaders ? `${sharePath}?_rsc` : sharePath;
    const response = await request(url, "GET", undefined, false, customHeaders);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    const body = await response.text();
    assert.ok(body.includes(content.split("\n")[0]));
    assert.ok(body.includes(answer.split("\n")[0]));
    for (const value of [draft, ipAddress, "ipAddress", "질문자 IP:"]) {
      assert.equal(body.includes(value), false);
    }
    if ("User-Agent" in customHeaders) {
      const head = body.split("</head>")[0];
      assert.ok(head.includes(`<link rel="canonical" href="${origin}${sharePath}"`));
      assert.ok(head.includes(`property="og:url" content="${origin}${sharePath}"`));
      assert.ok(
        head.includes(`property="og:title" content="${content.replace(/\s+/g, " ")} | ASK"`),
      );
      assert.ok(
        head.includes(`property="og:description" content="${answer.replace(/\s+/g, " ")}"`),
      );
      assert.ok(head.includes('name="twitter:card" content="summary"'));
      assert.equal(head.includes("untrusted.example"), false);
    }
  }

  for (const status of ["PENDING", "ARCHIVED"] as const) {
    const hidden = await request(endpoint, "PATCH", { answer: draft, status }, false, headers);
    assert.equal(hidden.status, 200);
    assert.deepEqual(await hidden.json(), { success: true, sharePath: null });
    await unavailable(sharePath, [content.split("\n")[0], draft, answer.split("\n")[0], ipAddress]);
    const republished = await request(
      endpoint,
      "PATCH",
      { answer, status: "PUBLISHED" },
      false,
      headers,
    );
    assert.deepEqual(await republished.json(), { success: true, sharePath });
    assert.equal((await request(sharePath)).status, 200);
  }

  const updated = "수정한 답변도 같은 주소에 표시됩니다.";
  await request(endpoint, "PATCH", { answer: updated, status: "PUBLISHED" }, false, headers);
  const updatedPage = await (await request(sharePath)).text();
  assert.ok(updatedPage.includes(updated));
  assert.equal(updatedPage.includes(answer.split("\n")[0]), false);

  // Even malformed legacy records cannot expose a question without a usable answer.
  for (const empty of [null, "", "   "]) {
    await getPrisma().question.update({ where: { id: question.id }, data: { answer: empty } });
    await unavailable(sharePath, [content.split("\n")[0], ipAddress]);
  }
  assert.equal((await request(endpoint, "DELETE", undefined, false, headers)).status, 200);
  await unavailable(sharePath, [content.split("\n")[0], updated, ipAddress]);
});

test("question submissions store IPv6 and leave unavailable addresses empty", async () => {
  for (const [header, expected] of [
    ["2001:db8::42", "2001:db8::42"],
    ["", null],
    ["198.51.100.1, 192.0.2.1", null],
  ] as const) {
    const content = `ip-question-${randomBytes(12).toString("hex")}`;
    const response = await request(
      "/api/questions",
      "POST",
      { content, ipAddress: "203.0.113.99" },
      false,
      {
        "X-Real-IP": header,
        "X-Forwarded-For": "203.0.113.99",
      },
    );
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true });
    const question = await getPrisma().question.findFirstOrThrow({ where: { content } });
    assert.equal(question.ipAddress, expected);
    await getPrisma().question.delete({ where: { id: question.id } });
  }
});

test("username login limits repeated attempts", async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await request(
      "/api/auth/sign-in/username",
      "POST",
      { username: "owner", password: "wrong" },
      false,
      { "X-Real-IP": "192.0.2.2" },
    );
    assert.equal(response.status, 401);
  }
  const limited = await request(
    "/api/auth/sign-in/username",
    "POST",
    { username: "owner", password },
    false,
    { "X-Real-IP": "192.0.2.2" },
  );
  assert.equal(limited.status, 429);
});

test("administrators can change their password and revoke only their own other sessions", async () => {
  let client = 10;
  const accountRequest = (url: string, method = "GET", body?: unknown, headers = {}) =>
    request(url, method, body, false, { "X-Real-IP": `192.0.2.${client++}`, ...headers });
  const cookies = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
  const login = async (username: string, secret: string) => {
    const response = await accountRequest("/api/auth/sign-in/username", "POST", {
      username,
      password: secret,
    });
    assert.equal(response.status, 200);
    return cookies(response);
  };
  const endpoint = "/api/auth/change-password";
  const newPassword = `  ${randomBytes(96).toString("hex")}  `;
  const body = { currentPassword: password, newPassword, revokeOtherSessions: true };
  assert.equal((await accountRequest(endpoint, "POST", body)).status, 401);

  const currentCookie = await login("owner", password);
  const otherCookie = await login("owner", password);
  const separateAdminCookie = await login("second_admin", secondAdminPassword);
  const headers = { Cookie: currentCookie };
  const account = await accountRequest("/admin/account", "GET", undefined, headers);
  assert.equal(account.status, 200);
  assert.match(account.headers.get("cache-control") ?? "", /no-store|private/);
  const page = await account.text();
  assert.ok(page.includes('href="/admin/account"'));
  assert.ok(page.includes('name="currentPassword"'));
  assert.ok(page.includes('name="newPassword"'));
  assert.ok(page.includes('name="confirmPassword"'));
  assert.ok(page.includes('value="owner"'));
  assert.equal(page.includes("@ask.invalid"), false);

  const owner = await getPrisma().user.findUniqueOrThrow({ where: { username: "owner" } });
  const credential = await getPrisma().account.findFirstOrThrow({
    where: { userId: owner.id, providerId: "credential" },
  });
  assert.equal(
    (
      await accountRequest(endpoint, "POST", body, {
        ...headers,
        Origin: "https://untrusted.example",
      })
    ).status,
    403,
  );
  const incorrect = await accountRequest(
    endpoint,
    "POST",
    { ...body, currentPassword: "incorrect" },
    headers,
  );
  assert.equal(incorrect.status, 400);
  assert.equal((await incorrect.json()).code, "INVALID_PASSWORD");
  assert.equal(
    (await accountRequest(endpoint, "POST", { ...body, newPassword: "" }, headers)).status,
    400,
  );
  assert.equal(
    (await getPrisma().account.findUniqueOrThrow({ where: { id: credential.id } })).password,
    credential.password,
  );

  const changed = await accountRequest(endpoint, "POST", body, headers);
  assert.equal(changed.status, 200);
  const updatedCookie = cookies(changed);
  assert.ok(updatedCookie.includes("session_token"));
  assert.equal(
    (await accountRequest("/admin/account", "GET", undefined, { Cookie: updatedCookie })).status,
    200,
  );
  for (const revoked of [currentCookie, otherCookie]) {
    assert.equal(
      (await accountRequest("/admin/account", "GET", undefined, { Cookie: revoked })).status,
      307,
    );
    assert.equal((await accountRequest(endpoint, "POST", body, { Cookie: revoked })).status, 401);
  }
  assert.equal(
    (await accountRequest("/admin/account", "GET", undefined, { Cookie: separateAdminCookie }))
      .status,
    200,
  );
  const oldLogin = await accountRequest("/api/auth/sign-in/username", "POST", {
    username: "owner",
    password,
  });
  assert.equal(oldLogin.status, 401);
  await login("owner", newPassword);
  await login("second_admin", secondAdminPassword);
});
