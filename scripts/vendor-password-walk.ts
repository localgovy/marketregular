import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import {
  decryptVendorPassword,
  encryptVendorPassword,
  generateVendorPassword,
  readVendorPassword,
  vendorPasswordKey,
  withMustSetPassword,
} from "../src/lib/vendor-password.ts";

function loadEnv(path: string) {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function assert(condition: unknown, step: string) {
  if (!condition) throw new Error(step);
  console.log("ok", step);
}

const env = loadEnv("/Users/noah/marketregularsite/.env.local");
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.VENDOR_PASSWORD_KEY = env.VENDOR_PASSWORD_KEY;
const key = vendorPasswordKey();
assert(url && serviceKey && anonKey && key, "env");

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `vendor-password-walk+${stamp}@marketregular.com`;
const oldPassword = `Oldpass${stamp}a`;
const ids: string[] = [];
let vendorId: string | null = null;

async function metadata(client: SupabaseClient, userId: string) {
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error(error?.message || "missing user");
  const raw = data.user.app_metadata;
  return {
    user: data.user,
    meta: raw && typeof raw === "object" ? ({ ...raw } as Record<string, unknown>) : {},
  };
}

try {
  const marker = await admin.auth.admin.createUser({
    email,
    password: oldPassword,
    email_confirm: true,
    app_metadata: { desk_marker: "keep" },
  });
  if (marker.error || !marker.data.user) throw new Error(marker.error?.message || "create");
  const userId = marker.data.user.id;
  ids.push(userId);
  assert(marker.data.user.app_metadata?.desk_marker === "keep", "marker on create");

  const profile = await admin.from("profiles").select("id, role").eq("id", userId).maybeSingle();
  assert(!profile.error && profile.data?.role === "user", "profile exists");

  const password = generateVendorPassword();
  const { user, meta } = await metadata(admin, userId);
  const stored = await admin.from("vendor_sign_in_secrets").upsert({
    user_id: userId,
    ciphertext: encryptVendorPassword(password, key!),
    chosen: false,
  });
  assert(!stored.error, "store one-time password");
  const updated = await admin.auth.admin.updateUserById(userId, {
    password,
    app_metadata: withMustSetPassword(meta, true),
  });
  assert(!updated.error, "set one-time password");
  assert(updated.data.user?.app_metadata?.desk_marker === "keep", "marker kept");
  assert(updated.data.user?.app_metadata?.must_set_password === true, "flag set");

  const stale = await anon.auth.signInWithPassword({ email, password: oldPassword });
  assert(Boolean(stale.error), "old password rejected");
  const signed = await anon.auth.signInWithPassword({ email, password });
  assert(!signed.error && signed.data.user?.app_metadata?.must_set_password === true, "one-time password signs in");
  await anon.auth.signOut();

  const leaked = await createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
    .from("vendor_sign_in_secrets")
    .select("ciphertext");
  assert(Boolean(leaked.error) || (leaked.data?.length ?? 0) === 0, "anon cannot read passwords");

  const member = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const memberSign = await member.auth.signInWithPassword({ email, password });
  assert(!memberSign.error, "member session");
  const memberRead = await member.from("vendor_sign_in_secrets").select("ciphertext");
  assert(Boolean(memberRead.error) || (memberRead.data?.length ?? 0) === 0, "signed-in user cannot read passwords");
  await member.auth.signOut();

  const secret = await admin
    .from("vendor_sign_in_secrets")
    .select("ciphertext, chosen")
    .eq("user_id", userId)
    .single();
  assert(!secret.error && secret.data?.chosen === false, "one-time row");
  const shown = readVendorPassword(secret.data!.ciphertext, false);
  assert(shown.label === "One-time password" && shown.value === password, "desk reads one-time password");
  assert(decryptVendorPassword(secret.data!.ciphertext, key!) === password, "decrypt matches");

  const vendor = await admin
    .from("vendors")
    .insert({ name: "Password walkthrough stall", slug: `password-walk-${stamp}` })
    .select("id")
    .single();
  assert(!vendor.error && vendor.data?.id, "draft stall");
  vendorId = vendor.data!.id;
  const claim = await admin
    .from("claim_requests")
    .insert({
      user_id: userId,
      target_type: "vendor",
      target_id: vendorId,
      evidence: "Password walkthrough",
    })
    .select("id")
    .single();
  assert(!claim.error, "claim");
  const decided = await admin.rpc("decide_claim", {
    p_id: claim.data!.id,
    p_status: "approved",
    p_note: null,
  });
  assert(!decided.error, "approve claim");
  const owned = await admin.from("vendors").select("claimed_by, status").eq("id", vendorId).single();
  assert(owned.data?.claimed_by === userId && owned.data?.status === "draft", "stall assigned and still draft");
  const role = await admin.from("profiles").select("role").eq("id", userId).single();
  assert(role.data?.role === "vendor", "role is vendor");

  const bareEmail = `vendor-password-walk-bare+${stamp}@marketregular.com`;
  const bare = await admin.auth.admin.createUser({ email: bareEmail, email_confirm: true });
  if (bare.error || !bare.data.user) throw new Error(bare.error?.message || "bare create");
  ids.push(bare.data.user.id);
  const barePassword = generateVendorPassword();
  const bareMeta = await metadata(admin, bare.data.user.id);
  const bareStore = await admin.from("vendor_sign_in_secrets").upsert({
    user_id: bare.data.user.id,
    ciphertext: encryptVendorPassword(barePassword, key!),
    chosen: false,
  });
  assert(!bareStore.error, "store password for account with no previous password");
  const bareUpdate = await admin.auth.admin.updateUserById(bare.data.user.id, {
    password: barePassword,
    app_metadata: withMustSetPassword(bareMeta.meta, true),
  });
  assert(!bareUpdate.error, "set password on account with no previous password");
  const providers = (bareUpdate.data.user?.identities ?? []).map((identity) => identity.provider).join(",");
  console.log("ok identity providers", providers || "none");
  const bareSign = await anon.auth.signInWithPassword({ email: bareEmail, password: barePassword });
  assert(!bareSign.error, "account with no previous password can sign in");
  await anon.auth.signOut();

  writeFileSync(
    "/tmp/vendor-password-walk.json",
    JSON.stringify({ email, password, userId, vendorId }),
    { mode: 0o600 },
  );
  console.log("ok ready for browser", email);
  void user;
} catch (error) {
  console.error("fail", error instanceof Error ? error.message : "walk");
  for (const id of ids) await admin.auth.admin.deleteUser(id);
  if (vendorId) await admin.from("vendors").delete().eq("id", vendorId);
  process.exitCode = 1;
}
