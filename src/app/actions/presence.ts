"use server";

import { encodeFloorBody } from "@/lib/floor-note";
import { allowedPostPhotos } from "@/lib/post-photos";
import { dbPublicError } from "@/lib/public-error";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

function hasCoords(lat?: number, lng?: number) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function isFlagTable(table: string): table is FlagTable {
  return FLAG_TABLES.has(table as FlagTable);
}

export async function createPost(input: {
  marketId: string;
  body: string;
  lat?: number;
  lng?: number;
  photos?: string[];
  tags?: string[];
  vendorSlug?: string;
  rating?: number;
  priceLevel?: number;
}) {
  const { supabase, user, demo } = await requireUser();
  if (demo) return { error: "Reviews aren't available right now. Try again later." };
  if (!supabase || !user) return { error: "Sign in to review." };
  if (!UUID.test(input.marketId)) return { error: "Pick a market." };

  const vendorSlug = await rosterVendorSlug(supabase, input.marketId, input.vendorSlug);
  const body = encodeFloorBody(
    input.body,
    input.tags ?? [],
    vendorSlug,
    input.rating,
    vendorSlug ? input.priceLevel : undefined,
  );
  if (input.body.trim().length < 3) return { error: "Write a little more." };
  if (body.length > 2000) return { error: "Reviews are limited to 2,000 characters." };

  const photos = allowedPostPhotos(user.id, input.photos ?? []);
  if (!photos) return { error: "Those photos could not be attached." };

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count ?? 0) >= 10) {
    return { error: "Daily review limit reached. See you tomorrow." };
  }

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      market_id: input.marketId,
      body,
      photos,
      verified_on_site: false,
    })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("Daily review limit")) {
      return { error: "Daily review limit reached. See you tomorrow." };
    }
    return { error: dbPublicError(error, "Could not post that review.") };
  }

  let verifiedOnSite = false;
  if (inserted && hasCoords(input.lat, input.lng)) {
    const { data } = await supabase.rpc("confirm_on_site", {
      p_post_id: inserted.id,
      p_lat: input.lat,
      p_lng: input.lng,
    });
    verifiedOnSite = data === true;
  }

  const { data: market } = await supabase
    .from("markets")
    .select("slug")
    .eq("id", input.marketId)
    .maybeSingle();
  revalidatePath("/");
  revalidatePath("/markets");
  revalidatePath("/account");
  revalidatePath("/feed");
  if (market?.slug) revalidatePath(`/markets/${market.slug}`);
  if (vendorSlug) revalidatePath(`/vendors/${vendorSlug}`);
  return { error: null, demo: false, verifiedOnSite };
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
  lat?: number;
  lng?: number;
  rating: number;
  vendorId?: string;
  vendorSlug?: string;
  tags: string[];
  priceLevel?: number;
}) {
  const post = await createPost({
    marketId: input.marketId,
    body: input.body,
    lat: input.lat,
    lng: input.lng,
    tags: input.tags,
    vendorSlug: input.vendorSlug,
    rating: input.rating >= 1 ? input.rating : undefined,
    priceLevel:
      input.vendorId && input.priceLevel && input.priceLevel >= 1 && input.priceLevel <= 3
        ? input.priceLevel
        : undefined,
  });
  if (post.error) return post;

  return { error: null, demo: post.demo, verifiedOnSite: post.verifiedOnSite === true };
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
