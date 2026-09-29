"use server";

import { encodeFloorBody } from "@/lib/floor-note";
import { allowedPostPhotos } from "@/lib/post-photos";
import { dbPublicError } from "@/lib/public-error";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const FLAG_TABLES = new Set(["posts", "reviews"] as const);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VENDOR_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type FlagTable = typeof FLAG_TABLES extends Set<infer T> ? T : never;

async function getClient() {
  return createServerSupabaseClient();
}

async function requireUser() {
  const supabase = await getClient();
  if (!supabase) return { supabase: null, user: null, demo: true as const };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, demo: false as const };
  return { supabase, user, demo: false as const };
}

const TAG = /^[a-z0-9-]{1,40}$/;

const postSchema = z.object({
  marketId: z.string().regex(UUID),
  body: z.string().max(4000),
  photos: z.array(z.string().max(2048)).max(8).optional(),
  tags: z.array(z.string().regex(TAG)).max(12).optional(),
  vendorSlug: z.string().max(160).optional(),
  rating: z.number().int().min(0).max(5).optional(),
  priceLevel: z.number().int().min(0).max(3).optional(),
});

function isFlagTable(table: string): table is FlagTable {
  return FLAG_TABLES.has(table as FlagTable);
}

export async function createPost(input: {
  marketId: string;
  body: string;
  photos?: string[];
  tags?: string[];
  vendorSlug?: string;
  rating?: number;
  priceLevel?: number;
}) {
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: "That review could not be posted." };
  const note = parsed.data;
  const { supabase, user, demo } = await requireUser();
  if (demo) return { error: "Reviews aren't available right now. Try again later." };
  if (!supabase || !user) return { error: "Sign in to review." };

  const vendorSlug = await rosterVendorSlug(supabase, note.marketId, note.vendorSlug);
  const rating = note.rating && note.rating >= 1 ? note.rating : undefined;
  const priceLevel =
    vendorSlug && note.priceLevel && note.priceLevel >= 1 ? note.priceLevel : undefined;
  const body = encodeFloorBody(note.body, note.tags ?? [], vendorSlug, rating, priceLevel);
  if (note.body.trim().length < 3) return { error: "Write a little more." };
  if (body.length > 2000) return { error: "Reviews are limited to 2,000 characters." };

  const photos = allowedPostPhotos(user.id, note.photos ?? []);
  if (!photos) return { error: "Those photos could not be attached." };

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count ?? 0) >= 10) {
    return { error: "Daily review limit reached. See you tomorrow." };
  }

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    market_id: note.marketId,
    body,
    photos,
    verified_on_site: false,
  });
  if (error) {
    if (error.message.includes("Daily review limit")) {
      return { error: "Daily review limit reached. See you tomorrow." };
    }
    return { error: dbPublicError(error, "Could not post that review.") };
  }

  const { data: market } = await supabase
    .from("markets")
    .select("slug")
    .eq("id", note.marketId)
    .maybeSingle();
  revalidatePath("/");
  revalidatePath("/markets");
  revalidatePath("/account");
  revalidatePath("/feed");
  if (market?.slug) revalidatePath(`/markets/${market.slug}`);
  if (vendorSlug) revalidatePath(`/vendors/${vendorSlug}`);
  return { error: null, demo: false };
}

async function rosterVendorSlug(
  supabase: NonNullable<Awaited<ReturnType<typeof getClient>>>,
  marketId: string,
  raw?: string,
) {
  const slug = raw?.trim() ?? "";
  if (!slug || !VENDOR_SLUG.test(slug)) return undefined;
  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!vendor?.id) return undefined;
  const { data: link } = await supabase
    .from("market_vendors")
    .select("vendor_id")
    .eq("market_id", marketId)
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  return link ? slug : undefined;
}

export async function composeFloorNote(input: {
  marketId: string;
  body: string;
  rating: number;
  vendorId?: string;
  vendorSlug?: string;
  tags: string[];
  priceLevel?: number;
}) {
  const parsed = postSchema
    .extend({
      vendorId: z.string().max(80).optional(),
      rating: z.number().int().min(0).max(5),
      tags: z.array(z.string().regex(TAG)).max(12),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "That review could not be posted." };
  const note = parsed.data;
  const post = await createPost({
    marketId: note.marketId,
    body: note.body,
    tags: note.tags,
    vendorSlug: note.vendorSlug,
    rating: note.rating >= 1 ? note.rating : undefined,
    priceLevel: note.vendorId && note.priceLevel ? note.priceLevel : undefined,
  });
  if (post.error) return post;
  return { error: null, demo: post.demo };
}

export async function deleteOwnPost(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id || !UUID.test(id)) return { error: "Missing post." };
  const { supabase, user, demo } = await requireUser();
  if (demo || !supabase || !user) return { error: "Sign in first." };
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: dbPublicError(error, "Could not remove that review.") };
  if (!data?.length) return { error: "That review cannot be removed." };
  revalidatePath("/account");
  revalidatePath("/");
  revalidatePath("/feed");
  return { error: null };
}

export async function flagItem(table: "posts" | "reviews", id: string) {
  if (!isFlagTable(table) || !UUID.test(id)) return { error: "Admins only." };
  const { supabase, user, demo } = await requireUser();
  if (demo || !supabase || !user) return { error: "Admins only." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Admins only." };
  const service = createServiceClient();
  if (!service) return { error: "Admins only." };
  const { error } = await service.from(table).update({ flagged: true }).eq("id", id);
  if (error) return { error: "Could not update that." };
  revalidatePath("/admin");
  revalidatePath("/");
  return { error: null };
}

export async function unflagItem(table: "posts" | "reviews", id: string) {
  if (!isFlagTable(table) || !UUID.test(id)) return { error: "Admins only." };
  const { supabase, user, demo } = await requireUser();
  if (demo || !supabase || !user) return { error: "Admins only." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { error: "Admins only." };
  const service = createServiceClient();
  if (!service) return { error: "Admins only." };
  const { error } = await service.from(table).update({ flagged: false }).eq("id", id);
  if (error) return { error: "Could not update that." };
  revalidatePath("/admin");
  return { error: null };
}
