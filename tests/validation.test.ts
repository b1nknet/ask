import assert from "node:assert/strict";
import { test } from "node:test";
import { questionSchema, answerSchema, setupSchema } from "../src/lib/validation";
import { RateLimiter } from "../src/lib/rate-limit";

test("initial setup validates usernames and password confirmation without trimming passwords", () => {
  const body = { username: " OwNeR ", password: " x ", confirmPassword: " x " };
  assert.deepEqual(setupSchema.parse(body), { ...body, username: "owner" });
  for (const invalid of [
    { ...body, username: "a" },
    { ...body, password: "", confirmPassword: "" },
    { ...body, confirmPassword: "x" },
    { ...body, confirmPassword: undefined },
  ]) {
    assert.equal(setupSchema.safeParse(invalid).success, false);
  }
  const password = "x".repeat(200);
  assert.equal(
    setupSchema.safeParse({ ...body, password, confirmPassword: password }).success,
    true,
  );
});

test("empty and oversized questions are rejected after trimming", () => {
  assert.equal(questionSchema.safeParse({ content: " \n " }).success, false);
  assert.equal(questionSchema.safeParse({ content: "가".repeat(1001) }).success, false);
  assert.equal(questionSchema.parse({ content: "  질문입니다  " }).content, "질문입니다");
});

test("publishing requires an answer; private drafts can be empty", () => {
  assert.equal(answerSchema.safeParse({ answer: " ", status: "PUBLISHED" }).success, false);
  assert.equal(answerSchema.safeParse({ answer: "", status: "PENDING" }).success, true);
  assert.equal(answerSchema.safeParse({ answer: "답변", status: "PUBLISHED" }).success, true);
  assert.equal(answerSchema.safeParse({ answer: "답변", status: "UNKNOWN" }).success, false);
});

test("rate limits isolate clients, expire, and resist bucket eviction", () => {
  const limiter = new RateLimiter(2, 1000, 2);
  assert.equal(limiter.consume("a", 0).allowed, true);
  assert.equal(limiter.consume("a", 1).allowed, true);
  assert.deepEqual(limiter.consume("a", 2), { allowed: false, retryAfter: 1 });
  assert.equal(limiter.consume("b", 2).allowed, true);
  assert.equal(limiter.consume("c", 2).allowed, false);
  assert.equal(limiter.consume("a", 3).allowed, false);
  assert.equal(limiter.consume("a", 1000).allowed, true);
});
