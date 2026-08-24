"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SaveKind, Saves } from "@/lib/saves";

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
    const { error } = await supabase.from("saves").upsert(
      { user_id: user.id, kind, slug },
      { onConflict: "user_id,kind,slug", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("slug", slug);
    if (error) throw new Error(error.message);
  }

  return listSaves(supabase, user.id);
}

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
  if (rows.length) {
    const { error } = await supabase
      .from("saves")
      .upsert(rows, { onConflict: "user_id,kind,slug", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  return listSaves(supabase, user.id);
}
