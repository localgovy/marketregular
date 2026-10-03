import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { before, describe, test } from "node:test";
import { applyClaimDecision } from "../src/lib/claim-approval.ts";
import { prepareVendorClaimPassword, saveChosenVendorPassword } from "../src/lib/issue-vendor-password.ts";
import { needsOnboarding, onboardingExemptPath, skipsShopperOnboarding } from "../src/lib/onboarding.ts";
import { CHOSEN_PASSWORD_MARKER, decryptVendorPassword, encryptVendorPassword } from "../src/lib/vendor-password.ts";
import { sendVendorPortalMail, vendorPortalLetter } from "../src/lib/vendor-portal-mail.ts";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const CLAIM = "66666666-6666-4666-8666-666666666666";
const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const VENDOR = "44444444-4444-4444-8444-444444444444";
const MARKET = "55555555-5555-4555-8555-555555555555";
const ALPHABET = /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]{12}$/;

type SecretRow = { user_id: string; ciphertext: string; chosen: boolean };
type AuthUpdate = { password?: string; app_metadata?: Record<string, unknown> };

type DeskState = {
  ops: string[];
  claim: { id: string; target_type: string; target_id: string; user_id: string } | null;
  claimError: { message: string } | null;
  stall: { id: string; claimed_by: string | null; slug: string } | null;
  stallError: { message: string } | null;
  market: { id: string; claimed_by: string | null; slug: string } | null;
  secrets: SecretRow[];
  users: Map<string, { email: string | null; app_metadata: Record<string, unknown>; password: string | null }>;
  rpcError: { message: string; code?: string } | null;
  lastRpc: { p_id: string; p_status: string; p_note: string | null } | null;
  secretReadError: boolean;
  failReread: boolean;
  failFirstUpsert: boolean;
  upserts: number;
  secretReads: number;
  failAuthOnCall: number | null;
  authCalls: number;
  authUpdates: AuthUpdate[];
  swapCiphertext: string | null;
  missingUser: boolean;
};

function createDesk() {
  const state: DeskState = {
    ops: [],
    claim: { id: CLAIM, target_type: "vendor", target_id: VENDOR, user_id: USER },
    claimError: null,
    stall: { id: VENDOR, claimed_by: null, slug: "river-fruit" },
    stallError: null,
    market: { id: MARKET, claimed_by: null, slug: "withrow" },
    secrets: [],
    users: new Map([
      [USER, { email: "stall@example.com", app_metadata: {}, password: "original" }],
    ]),
    rpcError: null,
    lastRpc: null,
    secretReadError: false,
    failReread: false,
    failFirstUpsert: false,
    upserts: 0,
    secretReads: 0,
    failAuthOnCall: null,
    authCalls: 0,
    authUpdates: [],
    swapCiphertext: null,
    missingUser: false,
  };

  function finishSecrets(mode: "select" | "delete", filters: Array<[string, unknown]>) {
    const matches = (row: SecretRow) => filters.every(([column, value]) => row[column as keyof SecretRow] === value);
    if (mode === "delete") {
      state.ops.push("delete");
      state.secrets = state.secrets.filter((row) => !matches(row));
      return { data: null, error: null };
    }
    state.secretReads += 1;
    if (state.secretReadError && state.secretReads === 1) {
      return { data: null, error: { message: "read" } };
    }
    if (state.failReread && state.secretReads >= 2) {
      return { data: null, error: { message: "reread" } };
    }
    return { data: state.secrets.find(matches) ?? null, error: null };
  }

  function from(table: string) {
    const filters: Array<[string, unknown]> = [];
    let mode: "select" | "delete" = "select";
    const finish = () => {
      if (table === "vendor_sign_in_secrets") return finishSecrets(mode, filters);
      if (table === "claim_requests") {
        if (state.claimError) return { data: null, error: state.claimError };
        const id = filters.find(([column]) => column === "id")?.[1];
        if (!state.claim || state.claim.id !== id) return { data: null, error: null };
        return {
          data: {
            target_type: state.claim.target_type,
            target_id: state.claim.target_id,
            user_id: state.claim.user_id,
          },
          error: null,
        };
      }
      if (table === "vendors") {
        if (state.stallError) return { data: null, error: state.stallError };
        const id = filters.find(([column]) => column === "id")?.[1];
        if (!state.stall || state.stall.id !== id) return { data: null, error: null };
        return { data: state.stall, error: null };
      }
      if (table === "markets") {
        const id = filters.find(([column]) => column === "id")?.[1];
        if (!state.market || state.market.id !== id) return { data: null, error: null };
        return { data: state.market, error: null };
      }
      return { data: null, error: { message: `unknown table ${table}` } };
    };
    const api = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push([column, value]);
        return api;
      },
      delete() {
        mode = "delete";
        return api;
      },
      upsert(row: SecretRow) {
        state.ops.push("upsert");
        state.upserts += 1;
        if (state.failFirstUpsert && state.upserts === 1) {
          return Promise.resolve({ data: null, error: { message: "store" } });
        }
        const next = { user_id: row.user_id, ciphertext: row.ciphertext, chosen: row.chosen === true };
        const index = state.secrets.findIndex((secret) => secret.user_id === row.user_id);
        if (index >= 0) state.secrets[index] = next;
        else state.secrets.push(next);
        return Promise.resolve({ data: null, error: null });
      },
      maybeSingle() {
        return Promise.resolve(finish());
      },
      then(onFulfilled: (value: { data: null; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(finish()).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  const client = {
    from,
    rpc(_name: string, args: { p_id: string; p_status: string; p_note: string | null }) {
      state.ops.push("rpc");
      state.lastRpc = args;
      if (state.rpcError) return { data: null, error: state.rpcError };
      if (args.p_status === "approved" && state.claim?.target_type === "vendor" && state.stall) {
        state.stall.claimed_by = state.claim.user_id;
      }
      if (args.p_status === "approved" && state.claim?.target_type === "market" && state.market) {
        state.market.claimed_by = state.claim.user_id;
      }
      return { data: null, error: null };
    },
    auth: {
      admin: {
        getUserById(id: string) {
          state.ops.push("getUser");
          if (state.missingUser) return { data: { user: null }, error: { message: "missing" } };
          const user = state.users.get(id);
          if (!user) return { data: { user: null }, error: { message: "missing" } };
          return {
            data: { user: { id, email: user.email, app_metadata: { ...user.app_metadata } } },
            error: null,
          };
        },
        updateUserById(id: string, attrs: AuthUpdate) {
          state.ops.push("updateUser");
          state.authCalls += 1;
          state.authUpdates.push(attrs);
          const user = state.users.get(id);
          if (state.swapCiphertext && state.authCalls === 1) {
            const secret = state.secrets.find((row) => row.user_id === id);
            if (secret) secret.ciphertext = state.swapCiphertext;
          }
          if (state.failAuthOnCall === state.authCalls) {
            return { data: { user: null }, error: { message: "auth" } };
          }
          if (user) {
            if (typeof attrs.password === "string") user.password = attrs.password;
            if (attrs.app_metadata) user.app_metadata = { ...attrs.app_metadata };
          }
          return { data: { user: user ? { id, ...user } : null }, error: null };
        },
      },
    },
  };

  return { state, client: client as unknown as SupabaseClient };
}

function assertUntouched(state: DeskState) {
  assert.equal(state.ops.includes("rpc"), false);
  assert.equal(state.ops.includes("getUser"), false);
  assert.equal(state.ops.includes("upsert"), false);
  assert.equal(state.ops.includes("updateUser"), false);
  assert.equal(state.secrets.length, 0);
  assert.equal(state.users.get(USER)?.password, "original");
}

async function decide(
  desk: ReturnType<typeof createDesk>,
  input: { status: string; note?: string },
  sent = true,
) {
  const mail: { email: string; password?: string; url: string }[] = [];
  const result = await applyClaimDecision(desk.client, { id: CLAIM, ...input }, async (email, password) => {
    mail.push({ email, password, url: vendorPortalLetter(password).url });
    return { sent };
  });
  return { result, mail };
}

describe("vendor claim approval", { concurrency: false }, () => {
  let key: Buffer;

  before(() => {
    key = randomBytes(32);
    process.env.VENDOR_PASSWORD_KEY = key.toString("base64");
  });

  test("a missing password key, missing stall, or other owner never reaches the claim or the password", async () => {
    const missingKey = createDesk();
    const previous = process.env.VENDOR_PASSWORD_KEY;
    delete process.env.VENDOR_PASSWORD_KEY;
    try {
      const { result, mail } = await decide(missingKey, { status: "approved" });
      assert.equal(result.error, "Stall passwords are not configured yet.");
      assert.equal(result.committed, false);
      assert.equal(mail.length, 0);
      assertUntouched(missingKey.state);
    } finally {
      process.env.VENDOR_PASSWORD_KEY = previous;
    }

    const missingStall = createDesk();
    missingStall.state.stall = null;
    const stalled = await decide(missingStall, { status: "approved" });
    assert.equal(stalled.result.error, "That listing is missing.");
    assert.equal(stalled.mail.length, 0);
    assertUntouched(missingStall.state);

    const taken = createDesk();
    taken.state.stall!.claimed_by = OTHER;
    const blocked = await decide(taken, { status: "approved" });
    assert.equal(blocked.result.error, "That listing is already claimed.");
    assert.equal(blocked.mail.length, 0);
    assert.equal(taken.state.stall?.claimed_by, OTHER);
    assertUntouched(taken.state);
  });

  test("a failed claim update leaves the password and secret untouched", async () => {
    const desk = createDesk();
    desk.state.rpcError = { message: "That listing is already claimed.", code: "P0001" };
    const { result, mail } = await decide(desk, { status: "approved" });
    assert.equal(result.error, "Could not update that claim.");
    assert.equal(result.committed, false);
    assert.equal(mail.length, 0);
    assert.deepEqual(desk.state.ops, ["rpc"]);
    assert.equal(desk.state.stall?.claimed_by, null);
    assert.equal(desk.state.users.get(USER)?.password, "original");
    assert.equal(desk.state.secrets.length, 0);
  });

  test("approval writes the claim before the one-time password, then mails the password page", async () => {
    const desk = createDesk();
    const { result, mail } = await decide(desk, { status: "approved" });
    const rpcAt = desk.state.ops.indexOf("rpc");
    const passwordAt = desk.state.ops.indexOf("updateUser");
    assert.equal(result.error, null);
    assert.equal(result.committed, true);
    assert.deepEqual(result.paths, ["/vendors/river-fruit"]);
    assert.equal(result.vendorId, VENDOR);
    assert.equal(result.mailFailed, null);
    assert.ok(rpcAt >= 0 && passwordAt > rpcAt);
    assert.equal(desk.state.stall?.claimed_by, USER);
    assert.equal(desk.state.lastRpc?.p_status, "approved");
    assert.equal(desk.state.lastRpc?.p_note, null);
    const user = desk.state.users.get(USER);
    const secret = desk.state.secrets[0];
    assert.ok(secret);
    assert.equal(secret.chosen, false);
    assert.match(user?.password ?? "", ALPHABET);
    assert.notEqual(user?.password, "original");
    assert.equal(decryptVendorPassword(secret.ciphertext, key), user?.password);
    assert.equal(user?.app_metadata.must_set_password, true);
    assert.equal(mail.length, 1);
    assert.equal(mail[0]?.email, "stall@example.com");
    assert.equal(mail[0]?.password, user?.password);
    assert.equal(new URL(mail[0]!.url).searchParams.get("next"), "/account/password");
  });

  test("a chosen password is not rotated and the mail opens the stall", async () => {
    const desk = createDesk();
    desk.state.secrets.push({
      user_id: USER,
      ciphertext: encryptVendorPassword("already-chosen", key),
      chosen: true,
    });
    desk.state.users.get(USER)!.app_metadata = { must_set_password: false };
    const { result, mail } = await decide(desk, { status: "approved" });
    assert.equal(result.error, null);
    assert.equal(desk.state.ops.includes("updateUser"), false);
    assert.equal(desk.state.ops.includes("upsert"), false);
    assert.equal(desk.state.users.get(USER)?.password, "original");
    assert.equal(desk.state.stall?.claimed_by, USER);
    assert.equal(mail[0]?.password, undefined);
    assert.equal(new URL(mail[0]!.url).pathname, "/vendor");
  });

  test("a still-pending one-time password is resent without another auth write", async () => {
    const desk = createDesk();
    desk.state.secrets.push({
      user_id: USER,
      ciphertext: encryptVendorPassword("kept-secret", key),
      chosen: false,
    });
    desk.state.users.get(USER)!.app_metadata = { must_set_password: true };
    const { result, mail } = await decide(desk, { status: "approved" });
    const rpcAt = desk.state.ops.indexOf("rpc");
    const readAt = desk.state.ops.indexOf("getUser");
    assert.equal(result.error, null);
    assert.ok(rpcAt >= 0 && readAt > rpcAt);
    assert.equal(desk.state.ops.includes("updateUser"), false);
    assert.equal(desk.state.ops.includes("upsert"), false);
    assert.equal(desk.state.users.get(USER)?.password, "original");
    assert.equal(mail[0]?.password, "kept-secret");
    assert.equal(new URL(mail[0]!.url).searchParams.get("next"), "/account/password");
  });

  test("a password failure after approval keeps the claim and the old password", async () => {
    const desk = createDesk();
    desk.state.failAuthOnCall = 1;
    const { result, mail } = await decide(desk, { status: "approved" });
    assert.equal(result.error, "Could not set a sign-in password.");
    assert.equal(result.committed, true);
    assert.equal(result.vendorId, VENDOR);
    assert.deepEqual(result.paths, ["/vendors/river-fruit"]);
    assert.equal(mail.length, 0);
    assert.equal(desk.state.stall?.claimed_by, USER);
    assert.equal(desk.state.users.get(USER)?.password, "original");
    assert.equal(desk.state.secrets.length, 0);
    assert.ok(desk.state.ops.indexOf("rpc") < desk.state.ops.indexOf("upsert"));
  });

  test("a mail failure leaves the approval and the owner in place", async () => {
    const desk = createDesk();
    const { result, mail } = await decide(desk, { status: "approved" }, false);
    assert.equal(result.error, null);
    assert.equal(result.committed, true);
    assert.deepEqual(result.mailFailed, { password: "1", vendorId: VENDOR });
    assert.equal(desk.state.stall?.claimed_by, USER);
    assert.match(desk.state.users.get(USER)?.password ?? "", ALPHABET);
    assert.equal(mail.length, 1);
    assert.equal(desk.state.ops.filter((op) => op === "rpc").length, 1);
  });

  test("a reread failure after the password is set still mails it", async () => {
    const desk = createDesk();
    desk.state.failReread = true;
    const { result, mail } = await decide(desk, { status: "approved" });
    assert.equal(result.error, null);
    assert.equal(result.mailFailed, null);
    assert.equal(mail.length, 1);
    assert.equal(mail[0]?.password, desk.state.users.get(USER)?.password);
    assert.match(mail[0]?.password ?? "", ALPHABET);
    assert.notEqual(mail[0]?.password, "original");

    const unsent = createDesk();
    unsent.state.failReread = true;
    const failed = await decide(unsent, { status: "approved" }, false);
    assert.equal(failed.result.error, null);
    assert.deepEqual(failed.result.mailFailed, { password: "1", vendorId: VENDOR });
    assert.equal(failed.mail[0]?.password, unsent.state.users.get(USER)?.password);
  });

  test("a failed realign keeps the password that can sign in and still mails it", async () => {
    const desk = createDesk();
    desk.state.swapCiphertext = encryptVendorPassword("swapped-pass", key);
    desk.state.failAuthOnCall = 2;
    const { result, mail } = await decide(desk, { status: "approved" });
    const signedIn = desk.state.users.get(USER)?.password;
    assert.equal(result.error, null);
    assert.equal(result.mailFailed, null);
    assert.equal(mail[0]?.password, signedIn);
    assert.notEqual(signedIn, "swapped-pass");
    assert.equal(decryptVendorPassword(desk.state.secrets[0]!.ciphertext, key), signedIn);
  });

  test("a chosen password that cannot be emailed still counts as no one-time password", async () => {
    const desk = createDesk();
    desk.state.secrets.push({
      user_id: USER,
      ciphertext: encryptVendorPassword("already-chosen", key),
      chosen: true,
    });
    const { result } = await decide(desk, { status: "approved" }, false);
    assert.equal(result.error, null);
    assert.deepEqual(result.mailFailed, { password: "0", vendorId: VENDOR });
    assert.equal(desk.state.users.get(USER)?.password, "original");
    assert.equal(desk.state.stall?.claimed_by, USER);
  });

  test("reject and market approval do not touch a stall password", async () => {
    const rejected = createDesk();
    const rejection = await decide(rejected, { status: "rejected", note: "Not enough evidence" });
    assert.equal(rejection.result.error, null);
    assert.equal(rejection.result.committed, true);
    assert.equal(rejection.result.vendorId, null);
    assert.deepEqual(rejection.result.paths, ["/vendors/river-fruit"]);
    assert.equal(rejection.mail.length, 0);
    assert.equal(rejected.state.lastRpc?.p_status, "rejected");
    assert.equal(rejected.state.lastRpc?.p_note, "Not enough evidence");
    assert.equal(rejected.state.stall?.claimed_by, null);
    assert.equal(rejected.state.ops.includes("getUser"), false);

    const market = createDesk();
    market.state.claim = { id: CLAIM, target_type: "market", target_id: MARKET, user_id: USER };
    const approved = await decide(market, { status: "approved" });
    assert.equal(approved.result.error, null);
    assert.equal(approved.result.vendorId, null);
    assert.deepEqual(approved.result.paths, ["/markets/withrow"]);
    assert.equal(approved.mail.length, 0);
    assert.equal(market.state.market?.claimed_by, USER);
    assert.equal(market.state.stall?.claimed_by, null);
    assert.equal(market.state.ops.includes("getUser"), false);
    assert.equal(market.state.users.get(USER)?.password, "original");
  });

  test("the claim note is trimmed and clipped to 500 characters", async () => {
    const desk = createDesk();
    desk.state.secrets.push({
      user_id: USER,
      ciphertext: encryptVendorPassword("already-chosen", key),
      chosen: true,
    });
    await decide(desk, { status: "approved", note: `  ${"n".repeat(600)}  ` });
    assert.equal(desk.state.lastRpc?.p_note?.length, 500);
    assert.equal(desk.state.lastRpc?.p_note, "n".repeat(500));

    const blank = createDesk();
    blank.state.claim = { id: CLAIM, target_type: "market", target_id: MARKET, user_id: USER };
    await decide(blank, { status: "rejected", note: "   \n  " });
    assert.equal(blank.state.lastRpc?.p_note, null);
  });

  test("password setup stops before a write when the account or secret cannot be read", async () => {
    const missingKey = createDesk();
    const previous = process.env.VENDOR_PASSWORD_KEY;
    delete process.env.VENDOR_PASSWORD_KEY;
    try {
      const result = await prepareVendorClaimPassword(missingKey.client, USER);
      assert.deepEqual(result, { error: "Stall passwords are not configured yet." });
      assertUntouched(missingKey.state);
    } finally {
      process.env.VENDOR_PASSWORD_KEY = previous;
    }

    const missingUser = createDesk();
    missingUser.state.missingUser = true;
    const noUser = await prepareVendorClaimPassword(missingUser.client, USER);
    assert.deepEqual(noUser, { error: "Could not open that account." });
    assert.equal(missingUser.state.ops.includes("upsert"), false);
    assert.equal(missingUser.state.ops.includes("updateUser"), false);

    const noEmail = createDesk();
    noEmail.state.users.get(USER)!.email = null;
    const emailed = await prepareVendorClaimPassword(noEmail.client, USER);
    assert.deepEqual(emailed, { error: "That account has no email." });
    assert.equal(noEmail.state.ops.includes("upsert"), false);

    const unread = createDesk();
    unread.state.secretReadError = true;
    const read = await prepareVendorClaimPassword(unread.client, USER);
    assert.deepEqual(read, { error: "Could not open that password." });
    assert.equal(unread.state.ops.includes("upsert"), false);
    assert.equal(unread.state.ops.includes("updateUser"), false);
  });

  test("a new password is stored unchosen and matches the auth password", async () => {
    const desk = createDesk();
    const result = await prepareVendorClaimPassword(desk.client, USER);
    assert.equal(result.error, null);
    if (result.error !== null) return;
    const secret = desk.state.secrets[0];
    assert.ok(secret);
    assert.equal(secret.chosen, false);
    assert.equal(result.password, desk.state.users.get(USER)?.password);
    assert.equal(decryptVendorPassword(secret.ciphertext, key), result.password);
    assert.equal(result.email, "stall@example.com");
    assert.equal(desk.state.users.get(USER)?.app_metadata.must_set_password, true);
    assert.match(result.password ?? "", ALPHABET);
  });

  test("a failed auth update deletes a new secret and restores a previous one", async () => {
    const fresh = createDesk();
    fresh.state.failAuthOnCall = 1;
    const created = await prepareVendorClaimPassword(fresh.client, USER);
    assert.deepEqual(created, { error: "Could not set a sign-in password." });
    assert.equal(fresh.state.secrets.length, 0);
    assert.equal(fresh.state.users.get(USER)?.password, "original");
    assert.equal(fresh.state.ops.includes("delete"), true);

    const previous = encryptVendorPassword("previous-secret", key);
    const existing = createDesk();
    existing.state.failAuthOnCall = 1;
    existing.state.secrets.push({ user_id: USER, ciphertext: previous, chosen: false });
    const restored = await prepareVendorClaimPassword(existing.client, USER);
    assert.deepEqual(restored, { error: "Could not set a sign-in password." });
    assert.deepEqual(existing.state.secrets, [{ user_id: USER, ciphertext: previous, chosen: false }]);
    assert.equal(existing.state.users.get(USER)?.password, "original");
  });

  test("a store failure never reaches auth", async () => {
    const desk = createDesk();
    desk.state.failFirstUpsert = true;
    const result = await prepareVendorClaimPassword(desk.client, USER);
    assert.deepEqual(result, { error: "Could not store that password." });
    assert.equal(desk.state.ops.includes("updateUser"), false);
    assert.equal(desk.state.secrets.length, 0);
    assert.equal(desk.state.users.get(USER)?.password, "original");
  });

  test("a chosen password is skipped and a pending one is resent", async () => {
    const chosen = createDesk();
    chosen.state.secrets.push({
      user_id: USER,
      ciphertext: encryptVendorPassword("mine", key),
      chosen: true,
    });
    const skipped = await prepareVendorClaimPassword(chosen.client, USER);
    assert.deepEqual(skipped, { error: null, email: "stall@example.com", password: null });
    assert.equal(chosen.state.ops.includes("upsert"), false);
    assert.equal(chosen.state.ops.includes("updateUser"), false);

    const pending = createDesk();
    pending.state.users.get(USER)!.app_metadata = { must_set_password: true };
    pending.state.secrets.push({
      user_id: USER,
      ciphertext: encryptVendorPassword("kept-secret", key),
      chosen: false,
    });
    const resent = await prepareVendorClaimPassword(pending.client, USER);
    assert.deepEqual(resent, { error: null, email: "stall@example.com", password: "kept-secret" });
    assert.equal(pending.state.ops.includes("updateUser"), false);

    const broken = createDesk();
    broken.state.users.get(USER)!.app_metadata = { must_set_password: true };
    broken.state.secrets.push({ user_id: USER, ciphertext: "not-a-secret", chosen: false });
    const unreadable = await prepareVendorClaimPassword(broken.client, USER);
    assert.deepEqual(unreadable, { error: "Could not read that password." });
    assert.equal(broken.state.ops.includes("updateUser"), false);
  });

  test("a secret replaced before the reread is the password that is returned", async () => {
    const desk = createDesk();
    desk.state.swapCiphertext = encryptVendorPassword("swapped-pass", key);
    const result = await prepareVendorClaimPassword(desk.client, USER);
    assert.deepEqual(result, { error: null, email: "stall@example.com", password: "swapped-pass" });
    assert.equal(desk.state.authUpdates.length, 2);
    assert.equal(desk.state.authUpdates[1]?.password, "swapped-pass");
    assert.equal(desk.state.users.get(USER)?.password, "swapped-pass");
    assert.equal(decryptVendorPassword(desk.state.secrets[0]!.ciphertext, key), "swapped-pass");
  });

  test("choosing a password marks it chosen and clears the first-sign-in flag", async () => {
    const desk = createDesk();
    desk.state.users.get(USER)!.app_metadata = { must_set_password: true, provider: "email" };
    const saved = await saveChosenVendorPassword(desk.client, { id: USER } as User, "chosen-pass-1");
    assert.deepEqual(saved, { error: null, stored: true, wrote: true });
    assert.equal(desk.state.secrets[0]?.chosen, true);
    assert.equal(desk.state.secrets[0]?.ciphertext, CHOSEN_PASSWORD_MARKER);
    assert.deepEqual(desk.state.users.get(USER)?.app_metadata, {
      must_set_password: false,
      provider: "email",
    });
    assert.equal("password" in (desk.state.authUpdates[0] ?? {}), false);

    const retry = createDesk();
    retry.state.failAuthOnCall = 1;
    retry.state.users.get(USER)!.app_metadata = { must_set_password: true };
    const retried = await saveChosenVendorPassword(retry.client, { id: USER } as User, "chosen-pass-2");
    assert.equal(retried.error, null);
    assert.equal(retry.state.authCalls, 2);
    assert.equal(retry.state.users.get(USER)?.app_metadata.must_set_password, false);

    const previous = process.env.VENDOR_PASSWORD_KEY;
    delete process.env.VENDOR_PASSWORD_KEY;
    try {
      const locked = createDesk();
      locked.state.users.get(USER)!.app_metadata = { must_set_password: true };
      const missing = await saveChosenVendorPassword(locked.client, { id: USER } as User, "chosen-pass-3");
      assert.equal(missing.error, null);
      assert.equal(locked.state.secrets[0]?.ciphertext, CHOSEN_PASSWORD_MARKER);
      assert.equal(locked.state.users.get(USER)?.app_metadata.must_set_password, false);
    } finally {
      if (previous === undefined) delete process.env.VENDOR_PASSWORD_KEY;
      else process.env.VENDOR_PASSWORD_KEY = previous;
    }
  });

  test("the approval mail escapes the password and points at the right page", async () => {
    const password = `a<b>&"c`;
    const once = vendorPortalLetter(password);
    assert.equal(new URL(once.url).searchParams.get("next"), "/account/password");
    assert.equal(once.text.includes(`Password: ${password}`), true);
    assert.equal(once.html.includes("a&lt;b&gt;&amp;&quot;c"), true);
    assert.equal(once.html.includes(password), false);
    const open = vendorPortalLetter();
    assert.equal(new URL(open.url).pathname, "/vendor");
    assert.equal(open.text.includes("Password:"), false);
    assert.equal(open.html.includes("Password:"), false);

    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    try {
      assert.deepEqual(await sendVendorPortalMail("stall@example.com", password), { sent: false });
    } finally {
      if (previousKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousKey;
      if (previousFrom === undefined) delete process.env.RESEND_FROM;
      else process.env.RESEND_FROM = previousFrom;
    }
  });

  test("a vendor skips shopper onboarding and the stall pages stay open", async () => {
    assert.equal(needsOnboarding({ onboarded_at: null, role: "vendor" }), false);
    let called = false;
    const skipped = await skipsShopperOnboarding(
      {
        rpc: async () => {
          called = true;
          return { data: false, error: null };
        },
      },
      { onboarded_at: null, role: "vendor" },
    );
    assert.equal(skipped, true);
    assert.equal(called, false);
    assert.equal(onboardingExemptPath("/vendor"), true);
    assert.equal(onboardingExemptPath(`/vendor/${VENDOR}`), true);
    assert.equal(onboardingExemptPath("/account/password"), true);
  });
});
