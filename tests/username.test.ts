import assert from "node:assert/strict";
import { test } from "node:test";
import { usernameSchema } from "../src/lib/username";

test("usernames normalize case and whitespace", () => {
  assert.equal(usernameSchema.parse("  Owner_01.Test  "), "owner_01.test");
});

test("usernames reject email addresses, spaces, and unsupported lengths", () => {
  for (const value of ["", "ab", "a".repeat(31), "owner@example.com", "own er", "관리자"]) {
    assert.equal(usernameSchema.safeParse(value).success, false, value);
  }
  assert.equal(usernameSchema.safeParse("a".repeat(30)).success, true);
});
