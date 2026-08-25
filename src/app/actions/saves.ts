"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SaveKind, Saves } from "@/lib/saves";
import { revalidatePath } from "next/cache";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validSlug(slug: string) {
  return slug.length >= 1 && slug.length <= 160 && SLUG.test(slug);
}

function validKind(kind: string): kind is SaveKind {
  return kind === "market" || kind === "vendor";
}

function toSaves(rows: Array<{ kind: string; slug: string }> | null): Saves {
  const markets: string[] = [];
  const vendors: string[] = [];
  for (const row of rows ?? []) {
    if (row.kind === "market") markets.push(row.slug);
    else if (row.kind === "vendor") vendors.push(row.slug);
  }
  return { markets, vendors };
}

async function listSaves(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<Saves> {
  const { data, error } = await supabase.from("saves").select("kind, slug").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return toSaves(data);
}

export async function persistSave(kind: SaveKind, slug: string, saved: boolean): Promise<Saves | null> {
  if (!validKind(kind) || !validSlug(slug)) return null;
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (saved) {
    const { error } = await supabase.from("saves").insert({ user_id: user.id, kind, slug });
    if (error && error.code !== "23505") throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("slug", slug);
    if (error) throw new Error(error.message);
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
  const existing = await listSaves(supabase, user.id);
  const have = new Set([
    ...existing.markets.map((slug) => `market:${slug}`),
    ...existing.vendors.map((slug) => `vendor:${slug}`),
  ]);
  const novel = rows.filter((row) => !have.has(`${row.kind}:${row.slug}`));
  const room = Math.max(0, MAX_SAVES - have.size);
  const capped = novel.slice(0, room);
  if (capped.length) {
    const { error } = await supabase
      .from("saves")
      .upsert(capped, { onConflict: "user_id,kind,slug", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/account");
  revalidatePath("/saved");
  return listSaves(supabase, user.id);
}
