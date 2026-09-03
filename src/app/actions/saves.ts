"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBlogPost } from "@/lib/blog";
import { savesFromRows, type SaveKind, type Saves } from "@/lib/saves";
import { revalidatePath } from "next/cache";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validSlug(slug: string) {
  return slug.length >= 1 && slug.length <= 160 && SLUG.test(slug);
}

function validKind(kind: string): kind is SaveKind {
  return kind === "market" || kind === "vendor" || kind === "blog";
}

async function listSaves(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<Saves | null> {
  const { data, error } = await supabase.from("saves").select("kind, slug").eq("user_id", userId);
  if (error) return null;
  return savesFromRows(data);
}

export async function persistSave(kind: SaveKind, slug: string, saved: boolean): Promise<Saves | null> {
  if (!validKind(kind) || !validSlug(slug)) return null;
  if (kind === "blog" && !getBlogPost(slug)) return null;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (saved) {
    const { error } = await supabase.from("saves").insert({ user_id: user.id, kind, slug });
    if (error && error.code !== "23505") return null;
  } else {
    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("slug", slug);
    if (error) return null;
  }

  revalidatePath("/account");
  revalidatePath("/saved");
  return listSaves(supabase, user.id);
}

const MAX_SAVES = 200;

export async function mergeSaves(local: Saves): Promise<Saves | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows: Array<{ user_id: string; kind: SaveKind; slug: string }> = [];
  for (const slug of local.markets ?? []) {
    if (validSlug(slug)) rows.push({ user_id: user.id, kind: "market", slug });
  }
  for (const slug of local.vendors ?? []) {
    if (validSlug(slug)) rows.push({ user_id: user.id, kind: "vendor", slug });
  }
  for (const slug of local.blogs ?? []) {
    if (validSlug(slug) && getBlogPost(slug)) {
      rows.push({ user_id: user.id, kind: "blog", slug });
    }
  }
  const existing = await listSaves(supabase, user.id);
  if (!existing) return null;
  const have = new Set([
    ...existing.markets.map((slug) => `market:${slug}`),
    ...existing.vendors.map((slug) => `vendor:${slug}`),
    ...existing.blogs.map((slug) => `blog:${slug}`),
  ]);
  const novel = rows.filter((row) => !have.has(`${row.kind}:${row.slug}`));
  const room = Math.max(0, MAX_SAVES - have.size);
  const capped = novel.slice(0, room);
  if (capped.length) {
    const { error } = await supabase
      .from("saves")
      .upsert(capped, { onConflict: "user_id,kind,slug", ignoreDuplicates: true });
    if (error) return null;
  }

  revalidatePath("/account");
  revalidatePath("/saved");
  return listSaves(supabase, user.id);
}
