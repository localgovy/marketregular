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
    const createdBlogs: string[] = [];
    const blogs = new Set(listings.map((row) => row.blog));
    for (const blog of blogs) {
      const blogInsert = await supabase.from("saves").insert({
        user_id: user.id,
        kind: "blog",
        slug: blog,
      });
      if (blogInsert.error && blogInsert.error.code !== "23505") return null;
      if (!blogInsert.error) createdBlogs.push(blog);
    }
    const inserted: string[] = [];
    for (const listing of listings) {
      const listingInsert = await supabase.from("saves").insert({
        user_id: user.id,
        kind: "listing",
        slug: listing.slug,
        detail: listingDetailJson(listing),
      });
      if (listingInsert.error && listingInsert.error.code !== "23505") {
        console.error("persistListingSaves insert", listingInsert.error);
        if (inserted.length) {
          await supabase
            .from("saves")
            .delete()
            .eq("user_id", user.id)
            .eq("kind", "listing")
            .in("slug", inserted);
        }
        if (createdBlogs.length) {
          await supabase
            .from("saves")
            .delete()
            .eq("user_id", user.id)
            .eq("kind", "blog")
            .in("slug", createdBlogs);
        }
        return null;
      }
      if (!listingInsert.error) inserted.push(listing.slug);
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
