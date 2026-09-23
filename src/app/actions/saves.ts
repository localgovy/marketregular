"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getBlogPost } from "@/lib/blog";
import {
  listingDetailJson,
  listingFromInput,
  validSaveSlug,
  type SavedListing,
} from "@/lib/listing-saves";
import { savesFromRows, type SaveKind, type Saves } from "@/lib/saves";
import { revalidatePath } from "next/cache";

function validKind(kind: string): kind is Exclude<SaveKind, "listing"> {
  return kind === "market" || kind === "vendor" || kind === "blog";
}

async function listSaves(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
): Promise<Saves | null> {
  const { data, error } = await supabase
    .from("saves")
    .select("kind, slug, detail")
    .eq("user_id", userId);
  if (error) {
    console.error("listSaves", error);
    return null;
  }
  return savesFromRows(data);
}

function touchSavedPaths() {
  revalidatePath("/account");
  revalidatePath("/saved");
}

export async function persistSave(kind: SaveKind, slug: string, saved: boolean): Promise<Saves | null> {
  if (!validKind(kind) || !validSaveSlug(slug)) return null;
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
    if (kind === "blog") {
      const existing = await listSaves(supabase, user.id);
      if (!existing) return null;
      const listingSlugs = existing.listings
        .filter((row) => row.blog === slug)
        .map((row) => row.slug);
      if (listingSlugs.length) {
        const listingDelete = await supabase
          .from("saves")
          .delete()
          .eq("user_id", user.id)
          .eq("kind", "listing")
          .in("slug", listingSlugs);
        if (listingDelete.error) return null;
      }
    }
    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("slug", slug);
    if (error) return null;
  }

  touchSavedPaths();
  return listSaves(supabase, user.id);
}

export async function persistListingSaves(
  inputs: Array<Omit<SavedListing, "slug">>,
  saved: boolean,
): Promise<Saves | null> {
  const listings: SavedListing[] = [];
  for (const input of inputs) {
    const listing = listingFromInput(input);
    if (!listing) {
      console.error("persistListingSaves invalid listing");
      return null;
    }
    if (!getBlogPost(listing.blog)) return null;
    listings.push(listing);
  }
  if (!listings.length) return null;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (saved) {
    const blogs = [...new Set(listings.map((row) => row.blog))];
    const { data: existingBlogs, error: existingError } = await supabase
      .from("saves")
      .select("slug")
      .eq("user_id", user.id)
      .eq("kind", "blog")
      .in("slug", blogs);
    if (existingError) return null;
    const already = new Set((existingBlogs ?? []).map((row) => row.slug));
    const { error: blogError } = await supabase.from("saves").upsert(
      blogs.map((slug) => ({ user_id: user.id, kind: "blog" as const, slug })),
      { onConflict: "user_id,kind,slug", ignoreDuplicates: true },
    );
    if (blogError) return null;
    const { error: listingError } = await supabase.from("saves").upsert(
      listings.map((listing) => ({
        user_id: user.id,
        kind: "listing" as const,
        slug: listing.slug,
        detail: listingDetailJson(listing),
      })),
      { onConflict: "user_id,kind,slug", ignoreDuplicates: true },
    );
    if (listingError) {
      console.error("persistListingSaves insert", listingError);
      const created = blogs.filter((slug) => !already.has(slug));
      if (created.length) {
        await supabase
          .from("saves")
          .delete()
          .eq("user_id", user.id)
          .eq("kind", "blog")
          .in("slug", created);
      }
      return null;
    }
  } else {
    const { error } = await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", "listing")
      .in(
        "slug",
        listings.map((row) => row.slug),
      );
    if (error) return null;
  }

  touchSavedPaths();
  return listSaves(supabase, user.id);
}

export async function persistListingSave(
  input: Omit<SavedListing, "slug">,
  saved: boolean,
): Promise<Saves | null> {
  return persistListingSaves([input], saved);
}

const MAX_SAVES = 200;

export async function mergeSaves(local: Saves, dropped: string[] = []): Promise<Saves | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows: Array<{
    user_id: string;
    kind: SaveKind;
    slug: string;
    detail?: ReturnType<typeof listingDetailJson>;
  }> = [];
  for (const slug of local.markets ?? []) {
    if (validSaveSlug(slug)) rows.push({ user_id: user.id, kind: "market", slug });
  }
  for (const slug of local.vendors ?? []) {
    if (validSaveSlug(slug)) rows.push({ user_id: user.id, kind: "vendor", slug });
  }
  for (const slug of local.blogs ?? []) {
    if (validSaveSlug(slug) && getBlogPost(slug)) {
      rows.push({ user_id: user.id, kind: "blog", slug });
    }
  }
  for (const item of local.listings ?? []) {
    const listing = listingFromInput(item);
    if (!listing || !getBlogPost(listing.blog)) continue;
    rows.push({ user_id: user.id, kind: "blog", slug: listing.blog });
    rows.push({
      user_id: user.id,
      kind: "listing",
      slug: listing.slug,
      detail: listingDetailJson(listing),
    });
  }
  const existing = await listSaves(supabase, user.id);
  if (!existing) return null;
  const have = new Set([
    ...existing.markets.map((slug) => `market:${slug}`),
    ...existing.vendors.map((slug) => `vendor:${slug}`),
    ...existing.blogs.map((slug) => `blog:${slug}`),
    ...existing.listings.map((row) => `listing:${row.slug}`),
  ]);
  const skip = new Set(dropped.filter((key) => typeof key === "string" && key));
  const novel = rows.filter((row) => {
    const key = `${row.kind}:${row.slug}`;
    return !have.has(key) && !skip.has(key);
  });
  const room = Math.max(0, MAX_SAVES - have.size);
  const capped = novel.slice(0, room);
  if (capped.length) {
    const { error } = await supabase
      .from("saves")
      .upsert(capped, { onConflict: "user_id,kind,slug", ignoreDuplicates: true });
    if (error) return null;
  }

  touchSavedPaths();
  return listSaves(supabase, user.id);
}
