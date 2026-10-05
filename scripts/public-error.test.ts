import assert from "node:assert/strict";
import { test } from "node:test";
import { signUpPublicError } from "../src/lib/public-error.ts";

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
