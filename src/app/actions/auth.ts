"use server";

import { AUTH_NEXT_COOKIE, authOrigin, safePath } from "@/lib/auth-redirect";
import {
  dbPublicError,
  isAuthRateLimited,
  passwordUpdatePublicError,
  signInPublicError,
  signUpPublicError,
} from "@/lib/public-error";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

async function confirmCurrentPassword(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  user: User,
  current: string,
) {
  if (!user.email || !current) return false;
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  return !error;
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
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
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
  return { error: null, message: "If you already have an account, sign in." };
}

export async function requestPasswordReset(formData: FormData) {
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
  const steppedUp =
    (await confirmCurrentPassword(supabase, user, current)) || recentlySignedIn(user);
  if (!steppedUp) {
    return hasPasswordIdentity(user)
      ? { error: "Enter your current password." }
      : { error: "Sign in again, then set a password." };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: passwordUpdatePublicError(error) };
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
  const steppedUp =
    (await confirmCurrentPassword(supabase, user, current)) || recentlySignedIn(user);
  if (!steppedUp) {
    return hasPasswordIdentity(user)
      ? { error: "Enter your current password." }
      : { error: "Sign in again, then delete the account." };
  }
  const admin = createServiceClient();
  if (!admin) return { error: "Account deletion is not configured." };
  await supabase.auth.signOut({ scope: "global" });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Could not delete the account." };
  redirect("/");
}
