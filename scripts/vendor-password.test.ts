import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import {
  canChangePassword,
  mustSetPassword,
  passwordChangeAllowed,
  recoveryMatchesUser,
} from "../src/lib/password-gate.ts";
import {
  alignIssuedPassword,
  CHOSEN_PASSWORD_MARKER,
  claimPasswordAction,
  decryptVendorPassword,
  encryptVendorPassword,
  generateVendorPassword,
  readVendorPassword,
  secretAfterFailedAuth,
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

test("a failed sign-in update restores the previous password copy", () => {
  assert.deepEqual(secretAfterFailedAuth(null), { action: "delete" });
  assert.deepEqual(secretAfterFailedAuth({ ciphertext: "v1.old", chosen: true }), {
    action: "restore",
    row: { ciphertext: "v1.old", chosen: true },
  });
});

test("the email uses the password that is actually stored", () => {
  assert.deepEqual(alignIssuedPassword("attempted", "attempted"), {
    password: "attempted",
    realign: false,
  });
  assert.deepEqual(alignIssuedPassword("attempted", "stored"), {
    password: "stored",
    realign: true,
  });
});

test("a later approval does not rotate a chosen or still-pending password", () => {
  assert.equal(claimPasswordAction(null, false), "issue");
  assert.equal(claimPasswordAction(null, true), "issue");
  assert.equal(claimPasswordAction({ chosen: false }, false), "issue");
  assert.equal(claimPasswordAction({ chosen: false }, true), "resend");
  assert.equal(claimPasswordAction({ chosen: true }, false), "skip");
  assert.equal(claimPasswordAction({ chosen: true }, true), "skip");
});

test("a recovery link can replace the password and a chosen secret is not readable", () => {
  assert.equal(
    canChangePassword({ recovery: true, hasPassword: true, currentOk: false, recentSignIn: false }),
    true,
  );
  assert.equal(
    canChangePassword({ recovery: false, hasPassword: true, currentOk: false, recentSignIn: true }),
    false,
  );
  assert.equal(
    canChangePassword({ recovery: false, hasPassword: true, currentOk: true, recentSignIn: false }),
    true,
  );
  assert.equal(
    canChangePassword({ recovery: false, hasPassword: false, currentOk: false, recentSignIn: true }),
    true,
  );
  assert.equal(
    recoveryMatchesUser("11111111-1111-4111-8111-111111111111", "11111111-1111-4111-8111-111111111111"),
    true,
  );
  assert.equal(
    recoveryMatchesUser("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"),
    false,
  );
  assert.equal(recoveryMatchesUser("1", "11111111-1111-4111-8111-111111111111"), false);
  assert.equal(readVendorPassword(CHOSEN_PASSWORD_MARKER, true), null);
  assert.equal(readVendorPassword("v1.still-sealed", true), null);
  assert.equal(CHOSEN_PASSWORD_MARKER.length >= 20, true);
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
