import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { mustSetPassword, passwordChangeAllowed } from "../src/lib/password-gate.ts";
import {
  claimPasswordAction,
  decryptVendorPassword,
  encryptVendorPassword,
  generateVendorPassword,
  vendorPasswordKey,
} from "../src/lib/vendor-password.ts";

const ALPHABET = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{12}$/;

test("a one-time password is 12 unambiguous characters", () => {
  const first = generateVendorPassword();
  const second = generateVendorPassword();
  assert.match(first, ALPHABET);
  assert.match(second, ALPHABET);
  assert.notEqual(first, second);
});

test("the stall password round-trips and rejects a changed copy", () => {
  const key = randomBytes(32);
  const sealed = encryptVendorPassword("stall-pass-1", key);
  assert.equal(decryptVendorPassword(sealed, key), "stall-pass-1");
  const long = encryptVendorPassword("x".repeat(72), key);
  assert.ok(sealed.length >= 20 && sealed.length <= 500);
  assert.ok(long.length <= 500);
  const flipped = sealed.slice(0, -1) + (sealed.endsWith("a") ? "b" : "a");
  assert.throws(() => decryptVendorPassword(flipped, key));
});

test("the stall password key is 32 bytes of base64", () => {
  const key = randomBytes(32).toString("base64");
  process.env.VENDOR_PASSWORD_KEY = `  ${key}  `;
  assert.equal(vendorPasswordKey()?.toString("base64"), key);
  process.env.VENDOR_PASSWORD_KEY = "short";
  assert.equal(vendorPasswordKey(), null);
  delete process.env.VENDOR_PASSWORD_KEY;
  assert.equal(vendorPasswordKey(), null);
});

test("a later approval does not rotate a chosen or still-pending password", () => {
  assert.equal(claimPasswordAction(null, false), "issue");
  assert.equal(claimPasswordAction(null, true), "issue");
  assert.equal(claimPasswordAction({ chosen: false }, false), "issue");
  assert.equal(claimPasswordAction({ chosen: false }, true), "resend");
  assert.equal(claimPasswordAction({ chosen: true }, false), "skip");
  assert.equal(claimPasswordAction({ chosen: true }, true), "skip");
});

test("the first sign-in can only open the new-password page", () => {
  assert.equal(mustSetPassword({ must_set_password: true }), true);
  assert.equal(mustSetPassword({ must_set_password: false }), false);
  assert.equal(mustSetPassword(null), false);
  assert.equal(passwordChangeAllowed("/account/password"), true);
  assert.equal(passwordChangeAllowed("/account/password?next=/vendor"), true);
  assert.equal(passwordChangeAllowed("/auth/confirm"), true);
  assert.equal(passwordChangeAllowed("/vendor"), false);
  assert.equal(passwordChangeAllowed("/account"), false);
  assert.equal(passwordChangeAllowed("/privacy"), false);
});
