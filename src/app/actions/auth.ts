"use server";

import { AUTH_NEXT_COOKIE, authOrigin, safePath } from "@/lib/auth-redirect";
import { isBlockedBot } from "@/lib/bot-check";
import { emailOtpType } from "@/lib/auth-callback";
import {
  dbPublicError,
  isAuthRateLimited,
  passwordUpdatePublicError,
  signInPublicError,
  signUpPublicError,
} from "@/lib/public-error";
import { createServiceClient } from "@/lib/supabase/admin";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

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
  await probe.auth.signOut();
  return true;
}

async function purgePostPhotos(
  admin: NonNullable<ReturnType<typeof createServiceClient>>,
  userId: string,
) {
  const bucket = admin.storage.from("post-photos");
  for (;;) {
    const { data, error } = await bucket.list(userId, { limit: 100 });
    if (error || !data?.length) return;
    const paths = data.filter((file) => file.name && file.id).map((file) => `${userId}/${file.name}`);
    if (!paths.length) return;
    const removed = await bucket.remove(paths);
    if (removed.error) {
      console.error("auth.purgePhotos", removed.error.message);
      return;
    }
    if (data.length < 100) return;
  }
}

function callbackUrl() {
  return `${authOrigin()}/auth/callback`;
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
  const next = safePath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: signInPublicError(error) };
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  if (await isBlockedBot()) return { error: "Could not create that account." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  const next = safePath(formData.get("next"));
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
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { error: null, message: "Check your email to confirm your account." };
}

export async function requestPasswordReset(formData: FormData) {
  if (await isBlockedBot()) return { error: "Wait a bit, then try again." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email on the account." };
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
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("auth.verifyOtp", error.code ?? "unknown");
    const dest =
      next !== "/account"
        ? `/login?error=session&next=${encodeURIComponent(next)}`
        : "/login?error=session";
    redirect(dest);
  }
  revalidatePath("/", "layout");
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
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  const steppedUp = hasPasswordIdentity(user)
    ? await confirmCurrentPassword(user, current)
    : recentlySignedIn(user);
  if (!steppedUp) {
    return hasPasswordIdentity(user)
      ? { error: "Enter your current password." }
      : { error: "Sign in again, then set a password." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: passwordUpdatePublicError(error) };
  await supabase.auth.signOut({ scope: "others" });
  redirect("/account");
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
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
  await purgePostPhotos(admin, user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Could not delete the account." };
  await supabase.auth.signOut({ scope: "global" });
  redirect("/");
}
