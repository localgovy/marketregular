import assert from "node:assert/strict";
import { test } from "node:test";
import { dbPublicError, signUpPublicError } from "../src/lib/public-error.ts";

test("section cap errors keep their copy", () => {
  assert.equal(
    dbPublicError({ code: "P0001", message: "A menu can have at most 5 sections" }, "fallback"),
    "A menu can have at most 5 sections.",
  );
});

test("an existing email gets the same reply as a new signup", () => {
  const message = "Check your email to confirm your account.";
  assert.deepEqual(signUpPublicError({ code: "user_already_exists" }), {
    error: null,
    message,
  });
  assert.deepEqual(signUpPublicError({ message: "User already registered" }), {
    error: null,
    message,
  });
  assert.deepEqual(signUpPublicError({ code: "email_exists" }), {
    error: null,
    message,
  });
});
