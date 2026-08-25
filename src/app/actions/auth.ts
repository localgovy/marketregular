"use server";

import { authOrigin, safePath } from "@/lib/auth-redirect";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function callbackUrl(next: unknown) {
  const path = safePath(next);
  return `${authOrigin()}/auth/callback?next=${encodeURIComponent(path)}`;
}

export async function signInWithPassword(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safePath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const next = safePath(formData.get("next"));
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(next),
      data: { display_name: displayName },
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(next);
  return { error: null, message: "Check your email to confirm your account." };
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email on the account." };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl("/account/password"),
  });
  if (error) return { error: error.message };
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
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords do not match." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
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
  if (error) return { error: error.message };
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
  const admin = createServiceClient();
  if (!admin) return { error: "Account deletion is not configured." };
  await supabase.auth.signOut({ scope: "global" });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };
  redirect("/");
}
