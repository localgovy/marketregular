import "server-only";

import {
  claimPasswordAction,
  decryptVendorPassword,
  encryptVendorPassword,
  generateVendorPassword,
  vendorPasswordKey,
  withMustSetPassword,
} from "@/lib/vendor-password";
import type { SupabaseClient, User } from "@supabase/supabase-js";

function metadata(user: User) {
  const raw = user.app_metadata;
  if (!raw || typeof raw !== "object") return {};
  return { ...raw } as Record<string, unknown>;
}

export type PreparedVendorPassword =
  | { error: string }
  | { error: null; email: string; password: string | null };

/** Sets the one-time password before the claim is marked approved. Mail is sent by the caller after that succeeds. */
export async function prepareVendorClaimPassword(
  admin: SupabaseClient,
  userId: string,
): Promise<PreparedVendorPassword> {
  const key = vendorPasswordKey();
  if (!key) return { error: "Stall passwords are not configured yet." };

  const { data: owner, error: ownerError } = await admin.auth.admin.getUserById(userId);
  if (ownerError || !owner.user) return { error: "Could not open that account." };
  const email = owner.user.email;
  if (!email) return { error: "That account has no email." };

  const { data: existing, error: readError } = await admin
    .from("vendor_sign_in_secrets")
    .select("ciphertext, chosen")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return { error: "Could not open that password." };

  const row =
    existing && typeof existing.ciphertext === "string"
      ? { ciphertext: existing.ciphertext, chosen: existing.chosen === true }
      : null;
  const action = claimPasswordAction(
    row ? { chosen: row.chosen } : null,
    metadata(owner.user).must_set_password === true,
  );

  if (action === "skip") return { error: null, email, password: null };

  if (action === "resend") {
    try {
      return { error: null, email, password: decryptVendorPassword(row!.ciphertext, key) };
    } catch {
      return { error: "Could not read that password." };
    }
  }

  const password = generateVendorPassword();
  const { error: storeError } = await admin.from("vendor_sign_in_secrets").upsert({
    user_id: userId,
    ciphertext: encryptVendorPassword(password, key),
    chosen: false,
  });
  if (storeError) return { error: "Could not store that password." };

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    app_metadata: withMustSetPassword(metadata(owner.user), true),
  });
  if (updateError) return { error: "Could not set a sign-in password." };

  return { error: null, email, password };
}

export async function syncChosenVendorPassword(admin: SupabaseClient, user: User, password: string) {
  const { data, error } = await admin
    .from("vendor_sign_in_secrets")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return { error: "Could not save that password.", stored: false, wrote: false };
  if (!data) return { error: null, stored: true, wrote: false };
  const saved = await saveChosenVendorPassword(admin, user, password);
  return { ...saved, wrote: !saved.error };
}

export async function saveChosenVendorPassword(admin: SupabaseClient, user: User, password: string) {
  const key = vendorPasswordKey();
  if (!key) return { error: "Could not save that password.", stored: false, wrote: false };
  const { error: storeError } = await admin.from("vendor_sign_in_secrets").upsert({
    user_id: user.id,
    ciphertext: encryptVendorPassword(password, key),
    chosen: true,
  });
  if (storeError) return { error: "Could not save that password.", stored: false, wrote: false };
  const nextMeta = withMustSetPassword(metadata(user), false);
  let { error: metaError } = await admin.auth.admin.updateUserById(user.id, { app_metadata: nextMeta });
  if (metaError) {
    metaError = (await admin.auth.admin.updateUserById(user.id, { app_metadata: nextMeta })).error;
  }
  if (metaError) return { error: "Could not finish that password.", stored: true, wrote: true };
  return { error: null, stored: true, wrote: true };
}
