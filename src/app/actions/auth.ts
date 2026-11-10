"use server";

import {
  AUTH_NEXT_COOKIE,
  PASSWORD_RECOVERY_COOKIE,
  authOrigin,
  passwordRecoveryCookie,
  safePath,
} from "@/lib/auth-redirect";
import { isBlockedBot, isHumanRequest } from "@/lib/bot-check";
import { takeResetSlot, takeSignInSlot } from "@/lib/mail-limit";
import { emailOtpType } from "@/lib/auth-callback";
import {
  dbPublicError,
  isAuthRateLimited,
  passwordUpdatePublicError,
  signInPublicError,
  signUpPublicError,
} from "@/lib/public-error";
import { filePortalApplication } from "@/lib/file-portal-application";
import {
  markChosenVendorPassword,
  saveChosenVendorPassword,
  syncChosenVendorPassword,
} from "@/lib/issue-vendor-password";
import {
  PORTAL_ORG_COOKIE,
  PORTAL_SIGNUP_META,
  clipOrganizationName,
  encodePortalOrgCookie,
  portalHomePath,
  portalKind,
  portalOrgCookieOptions,
  portalRequestId,
  portalSignupRecord,
  readPortalSignupIntent,
} from "@/lib/portal-application";
import { canChangePassword, mustSetPassword, recoveryMatchesUser } from "@/lib/password-gate";
import { createServiceClient } from "@/lib/supabase/admin";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { ClaimTarget } from "@/types/database";

const STEP_UP_MS = 10 * 60 * 1000;

function recentlySignedIn(user: User) {
  const at = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0;
  return Number.isFinite(at) && Date.now() - at < STEP_UP_MS;
}

function hasPasswordIdentity(user: User) {
  return (user.identities ?? []).some((identity) => identity.provider === "email");
}

async function confirmCurrentPassword(user: User, current: string) {
  if (!user.email || !current) return false;
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return false;
  const probe = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await probe.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (error) return false;
  await probe.auth.signOut({ scope: "local" });
  return true;
}

const MAX_EMAIL = 320;
const MAX_PASSWORD = 72;

function credentialSizeOk(email: string, password = "") {
  return email.length <= MAX_EMAIL && password.length <= MAX_PASSWORD;
}

async function purgePrefix(
  bucket: ReturnType<NonNullable<ReturnType<typeof createServiceClient>>["storage"]["from"]>,
  prefix: string,
  depth = 0,
): Promise<boolean> {
  if (depth > 4) return false;
  for (let page = 0; page < 20; page += 1) {
    const { data, error } = await bucket.list(prefix, { limit: 100 });
    if (error) {
      console.error("auth.purgePhotos", error.message);
      return false;
    }
    if (!data?.length) return true;
    const files: string[] = [];
    const folders: string[] = [];
    for (const entry of data) {
      if (!entry.name || entry.name.includes("..") || entry.name.includes("/")) continue;
      const path = `${prefix}/${entry.name}`;
      if (entry.id == null) folders.push(path);
      else files.push(path);
    }
    if (files.length) {
      const removed = await bucket.remove(files);
      if (removed.error) {
        console.error("auth.purgePhotos", removed.error.message);
        return false;
      }
    }
    for (const folder of folders) {
      if (!(await purgePrefix(bucket, folder, depth + 1))) return false;
    }
    if (!files.length) return true;
  }
  return false;
}

async function purgePostPhotos(
  admin: NonNullable<ReturnType<typeof createServiceClient>>,
  userId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return false;
  return purgePrefix(admin.storage.from("post-photos"), userId);
}

function callbackUrl() {
  return `${authOrigin()}/auth/callback`;
}

async function rememberPortalIntent(
  user: User,
  kind: ClaimTarget,
  requestId: string | null,
  organization: string | null,
) {
  const admin = createServiceClient();
  if (!admin) return;
  const marked = await markChosenVendorPassword(admin, user);
  if (marked.error) console.error("auth.portalPassword", marked.error);
  const { data: fresh } = await admin.auth.admin.getUserById(user.id);
  const base = (fresh.user?.app_metadata ?? user.app_metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...base,
      [PORTAL_SIGNUP_META]: portalSignupRecord(kind, requestId, organization),
    },
  });
  if (error) console.error("auth.portalSignup", error.message);
}

async function clearPortalIntent(userId: string) {
  const admin = createServiceClient();
  if (!admin) return;
  const { data: fresh } = await admin.auth.admin.getUserById(userId);
  if (!fresh.user) return;
  const meta = { ...(fresh.user.app_metadata ?? {}) } as Record<string, unknown>;
  delete meta[PORTAL_SIGNUP_META];
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: meta });
  if (error) console.error("auth.portalSignup", error.message);
}

/** Account pages only. The public shell reads the session in the browser. */
function revalidateSignedInPages() {
  revalidatePath("/account");
  revalidatePath("/saved");
  revalidatePath("/onboarding");
}

async function rememberAuthNext(next: unknown) {
  const path = safePath(next);
  const jar = await cookies();
  jar.set(AUTH_NEXT_COOKIE, path, {
    path: "/",
    maxAge: 600,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return path;
}

export async function signInWithPassword(formData: FormData) {
  if (await isBlockedBot()) return { error: "Could not sign in." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!credentialSizeOk(email, password)) return { error: "Email or password is not right." };
  if (!(await takeSignInSlot(email))) return { error: "Wait a bit, then try again." };
  const next = safePath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: signInPublicError(error) };
  const jar = await cookies();
  jar.set(PASSWORD_RECOVERY_COOKIE, "", passwordRecoveryCookie(0));
  revalidateSignedInPages();
  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  if (!(await isHumanRequest())) return { error: "Could not create that account." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  const next = safePath(formData.get("next"));
  if (!credentialSizeOk(email, password) || !credentialSizeOk(email, confirm)) {
    return { error: "Could not create that account." };
  }
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  await rememberAuthNext(next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(),
      data: { display_name: displayName },
    },
  });
  if (error) return signUpPublicError(error);
  if (data.session) {
    const jar = await cookies();
    jar.set(PASSWORD_RECOVERY_COOKIE, "", passwordRecoveryCookie(0));
    revalidateSignedInPages();
    redirect(next);
  }
  return { error: null, message: "Check your email to confirm your account." };
}

export async function signUpForPortal(formData: FormData) {
  if (!(await isHumanRequest())) return { error: "Could not create that account." };
  if (String(formData.get("_gotcha") ?? "").trim()) {
    return { error: null, message: "Check your email to confirm your account." };
  }
  const kind = portalKind(formData.get("kind"));
  if (!kind) return { error: "That portal is missing." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  if (!credentialSizeOk(email, password) || !credentialSizeOk(email, confirm)) {
    return { error: "Could not create that account." };
  }
  const requestId = portalRequestId(formData.get("request_id"));
  const organization = requestId ? null : clipOrganizationName(formData.get("organization_name"));
  const next = portalHomePath(kind, requestId);
  if (displayName.length < 2) return { error: "Add your name." };
  if (!requestId && !organization) return { error: "Add the organization name." };
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  await rememberAuthNext(next);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(),
      data: { display_name: displayName },
    },
  });
  if (error) return signUpPublicError(error);
  if (organization) {
    const jar = await cookies();
    jar.set(PORTAL_ORG_COOKIE, encodePortalOrgCookie(organization), portalOrgCookieOptions());
  }
  if (data.session && data.user) {
    const admin = createServiceClient();
    if (admin) {
      const marked = await markChosenVendorPassword(admin, data.user);
      if (marked.error) console.error("auth.portalPassword", marked.error);
    }
    const filed = await filePortalApplication({
      supabase,
      kind,
      requestId,
      organizationName: organization,
    });
    if (filed.error) return { error: filed.error };
    const jar = await cookies();
    jar.set(PASSWORD_RECOVERY_COOKIE, "", passwordRecoveryCookie(0));
    revalidateSignedInPages();
    redirect(next);
  }
  if (data.user) await rememberPortalIntent(data.user, kind, requestId, organization);
  return { error: null, message: "Check your email to confirm your account." };
}

export async function requestPasswordReset(formData: FormData) {
  if (!(await isHumanRequest())) return { error: "Wait a bit, then try again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email on the account." };
  if (!credentialSizeOk(email)) {
    return { error: null, message: "Check your email for a reset link." };
  }
  if (!(await takeResetSlot(email))) return { error: "Wait a bit, then try again." };
  await rememberAuthNext("/account/password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl(),
  });
  if (error && isAuthRateLimited(error)) {
    return { error: "Wait a bit, then try again." };
  }
  return { error: null, message: "Check your email for a reset link." };
}

export async function verifyEmailOtp(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const type = emailOtpType(String(formData.get("type") ?? "") || null);
  const next = safePath(formData.get("next"));
  if (!tokenHash || !type) redirect("/login?error=session");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?error=session");
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("auth.verifyOtp", error.code ?? "unknown");
    const dest =
      next !== "/account"
        ? `/login?error=session&next=${encodeURIComponent(next)}`
        : "/login?error=session";
    redirect(dest);
  }
  revalidateSignedInPages();
  if (type === "recovery") {
    const userId = data.user?.id;
    if (userId) {
      const jar = await cookies();
      jar.set(PASSWORD_RECOVERY_COOKIE, userId, passwordRecoveryCookie(600));
    }
    redirect("/account/password");
  }
  const intent = readPortalSignupIntent(data.user?.app_metadata);
  if (intent && data.user) {
    const admin = createServiceClient();
    if (admin) {
      const marked = await markChosenVendorPassword(admin, data.user);
      if (marked.error) console.error("auth.portalPassword", marked.error);
    }
    const filed = await filePortalApplication({
      supabase,
      kind: intent.kind,
      requestId: intent.requestId,
      organizationName: intent.organizationName,
    });
    if (!filed.error) {
      await clearPortalIntent(data.user.id);
    } else if (intent.organizationName) {
      const jar = await cookies();
      jar.set(PORTAL_ORG_COOKIE, encodePortalOrgCookie(intent.organizationName), portalOrgCookieOptions());
    }
    redirect(portalHomePath(intent.kind, intent.requestId));
  }
  redirect(next);
}

export async function updatePassword(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const current = String(formData.get("current_password") ?? "");
  const forced = mustSetPassword(user.app_metadata);
  const jar = await cookies();
  const recovery = recoveryMatchesUser(jar.get(PASSWORD_RECOVERY_COOKIE)?.value, user.id);
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  const hasPassword = hasPasswordIdentity(user);
  const steppedUp = canChangePassword({
    recovery,
    hasPassword,
    currentOk: !recovery && hasPassword ? await confirmCurrentPassword(user, current) : false,
    recentSignIn: recentlySignedIn(user),
  });
  if (!steppedUp) {
    return hasPasswordIdentity(user)
      ? { error: "Enter your current password." }
      : { error: "Sign in again, then set a password." };
  }
  const admin = createServiceClient();
  if (forced && !admin) return { error: "Could not save that password." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: passwordUpdatePublicError(error) };
  if (admin) {
    const saved = forced
      ? await saveChosenVendorPassword(admin, user, password)
      : await syncChosenVendorPassword(admin, user, password);
    if (saved.error) {
      if (!saved.stored && current) {
        await admin.auth.admin.updateUserById(user.id, { password: current });
      }
      return { error: saved.error };
    }
    if (forced || saved.wrote) revalidatePath("/admin/vendors", "layout");
  }
  jar.set(PASSWORD_RECOVERY_COOKIE, "", passwordRecoveryCookie(0));
  if (forced) {
    await supabase.auth.refreshSession();
    await supabase.auth.signOut({ scope: "others" });
    const [{ data: ownsMarket }, { data: ownsVendor }] = await Promise.all([
      supabase.rpc("has_owned_market"),
      supabase.rpc("has_owned_vendor"),
    ]);
    if (ownsMarket === true && ownsVendor === true) redirect("/account");
    if (ownsMarket === true) redirect("/market");
    redirect("/vendor");
  }
  await supabase.auth.signOut({ scope: "others" });
  redirect("/account");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  const jar = await cookies();
  jar.set(PASSWORD_RECOVERY_COOKIE, "", passwordRecoveryCookie(0));
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const display_name = String(formData.get("display_name") ?? "").trim();
  if (display_name.length < 2) return { error: "Add the name that sits on posts." };
  if (display_name.length > 60) return { error: "Keep that name under 60 characters." };
  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);
  if (error) return { error: dbPublicError(error, "Could not save that name.") };
  revalidatePath("/account");
  return { error: null };
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (confirm !== "delete") return { error: "Type delete to confirm." };
  const current = String(formData.get("current_password") ?? "");
  const steppedUp = hasPasswordIdentity(user)
    ? await confirmCurrentPassword(user, current)
    : recentlySignedIn(user);
  if (!steppedUp) {
    return hasPasswordIdentity(user)
      ? { error: "Enter your current password." }
      : { error: "Sign in again, then delete the account." };
  }
  const admin = createServiceClient();
  if (!admin) return { error: "Account deletion is not configured." };
  const purged = await purgePostPhotos(admin, user.id);
  if (!purged) return { error: "Could not delete the account." };
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Could not delete the account." };
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}
