"use server";

import { authOrigin, safePath } from "@/lib/auth-redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithPassword(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safePath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");
  const origin = authOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { display_name: displayName },
    },
  });
  if (error) return { error: error.message };
  return { error: null, message: "Check your email to confirm your account." };
}

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const email = String(formData.get("email") ?? "");
  const origin = authOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { error: null, message: "Magic link sent. Check your inbox." };
}

export async function signInWithGoogle(next = "/account") {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const origin = authOrigin();
  const path = safePath(next);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(path)}`,
    },
  });
  if (error || !data.url) return { error: error?.message ?? "OAuth failed" };
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const display_name = String(formData.get("display_name") ?? "").trim();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
}
