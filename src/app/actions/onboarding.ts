"use server";

import { listMarkets } from "@/lib/data/catalog";
import { safePath } from "@/lib/auth-redirect";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeUsername, usernameError } from "@/lib/username";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validSlug(slug: string) {
  return slug.length >= 1 && slug.length <= 160 && SLUG.test(slug);
}

export async function usernameAvailable(raw: string) {
  const error = usernameError(raw);
  if (error) return { available: false as const, error };
  const username = normalizeUsername(raw);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { available: false as const, error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false as const, error: "Sign in first." };
  const { data, error: queryError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (queryError) return { available: false as const, error: queryError.message };
  if (data && data.id !== user.id) return { available: false as const, error: "That handle is taken." };
  return { available: true as const, error: null };
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const next = safePath(formData.get("next"));
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const formatError = usernameError(username);
  if (formatError) return { error: formatError };

  const slugs = ["favorite_0", "favorite_1", "favorite_2"]
    .map((key) => String(formData.get(key) ?? "").trim())
    .filter(Boolean);
  if (slugs.length !== 3 || new Set(slugs).size !== 3) {
    return { error: "Pick three different markets." };
  }
  if (!slugs.every(validSlug)) return { error: "Those markets are not valid." };

  const markets = await listMarkets();
  const published = new Set(markets.map((market) => market.slug));
  if (slugs.some((slug) => !published.has(slug))) {
    return { error: "Pick three markets from the list." };
  }

  const taken = await usernameAvailable(username);
  if (!taken.available) return { error: taken.error ?? "That handle is taken." };

  const rows = slugs.map((slug) => ({ user_id: user.id, kind: "market" as const, slug }));
  const { error: saveError } = await supabase.from("saves").upsert(rows, {
    onConflict: "user_id,kind,slug",
    ignoreDuplicates: true,
  });
  if (saveError) return { error: saveError.message };

  const patch = {
    username,
    favorite_market_slugs: slugs,
  };
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { error: "That handle is taken." };
    return { error: error.message };
  }

  if (!updated) {
    const meta = user.user_metadata ?? {};
    const fromMeta = [meta.display_name, meta.full_name, meta.name].find(
      (value) => typeof value === "string" && value.trim(),
    );
    const displayName =
      (typeof fromMeta === "string" ? fromMeta.trim() : "") ||
      user.email?.split("@")[0] ||
      "Regular";
    const avatar =
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null;
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatar,
      ...patch,
    });
    if (insertError) {
      if (insertError.code === "23505") return { error: "That handle is taken." };
      return { error: insertError.message };
    }
  }

  const service = createServiceClient();
  if (!service) return { error: "Supabase is not configured yet." };
  const { data: stamped, error: stampError } = await service.rpc("stamp_onboarded_at", {
    p_user_id: user.id,
  });
  if (stampError) return { error: stampError.message };
  if (!stamped) {
    return { error: "Could not finish setting up this account. Try again." };
  }

  revalidatePath("/account");
  revalidatePath("/saved");
  revalidatePath("/onboarding");
  redirect(next === "/onboarding" ? "/account" : next);
}

export async function updateUsername(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const formatError = usernameError(username);
  if (formatError) return { error: formatError };
  const taken = await usernameAvailable(username);
  if (!taken.available) return { error: taken.error ?? "That handle is taken." };
  const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "That handle is taken." };
    return { error: error.message };
  }
  revalidatePath("/account");
  return { error: null };
}
