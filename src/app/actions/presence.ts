"use server";

import { isWithinGeofence } from "@/lib/geo";
import { encodeFloorBody } from "@/lib/floor-note";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

async function verifyOnSite(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  marketId: string,
  lat: number,
  lng: number,
) {
  const { data: rpc } = await supabase.rpc("is_within_market", {
    p_market_id: marketId,
    p_lat: lat,
    p_lng: lng,
  });
  if (rpc === true) return true;

  const { data: market } = await supabase
    .from("markets")
    .select("lat, lng, geofence_radius_m, status")
    .eq("id", marketId)
    .maybeSingle();
  if (!market || market.status !== "published") return false;
  return isWithinGeofence(
    { lat, lng },
    { lat: market.lat, lng: market.lng },
    market.geofence_radius_m,
  );
}

async function onSiteIfShared(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  marketId: string,
  lat?: number,
  lng?: number,
) {
  if (!hasCoords(lat, lng)) return false;
  return verifyOnSite(supabase, marketId, lat!, lng!);
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
  const body = encodeFloorBody(
    input.body,
    input.tags ?? [],
    input.vendorSlug,
    input.rating,
    input.vendorSlug ? input.priceLevel : undefined,
  );
  if (input.body.trim().length < 3) return { error: "Write a little more." };
  if (body.length > 2000) return { error: "Reviews are limited to 2,000 characters." };

  const { supabase, user, demo } = await requireUser();
  if (demo) return { error: null, demo: true };
  if (!supabase || !user) return { error: "Sign in to review." };

  const onSite = await onSiteIfShared(supabase, input.marketId, input.lat, input.lng);

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
    market_id: input.marketId,
    body,
    photos: input.photos ?? [],
    verified_on_site: onSite,
  });
  if (error) return { error: error.message };

  const { data: market } = await supabase
    .from("markets")
    .select("slug")
    .eq("id", input.marketId)
    .maybeSingle();
  revalidatePath("/");
  revalidatePath("/search");
  if (market?.slug) revalidatePath(`/markets/${market.slug}`);
  if (input.vendorSlug) revalidatePath(`/vendors/${input.vendorSlug}`);
  return { error: null, demo: false };
}

export async function createReview(input: {
  marketId?: string;
  vendorId?: string;
  rating: number;
  body: string;
  lat?: number;
  lng?: number;
}) {
  const body = input.body.trim();
  if (!input.marketId && !input.vendorId) return { error: "Pick a market or vendor." };
  if (input.rating < 1 || input.rating > 5) return { error: "Rating must be 1–5." };
  if (body.length < 8) return { error: "Tell people a bit more about your visit." };

  const { supabase, user, demo } = await requireUser();
  if (demo) return { error: null, demo: true };
  if (!supabase || !user) return { error: "Sign in to post." };

  let marketId = input.marketId;
  if (!marketId && input.vendorId) {
    const { data: link } = await supabase
      .from("market_vendors")
      .select("market_id")
      .eq("vendor_id", input.vendorId)
      .limit(1)
      .maybeSingle();
    marketId = link?.market_id;
  }
  if (!marketId) return { error: "Could not match this vendor to a market." };

  const onSite = await onSiteIfShared(supabase, marketId, input.lat, input.lng);

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    market_id: input.vendorId ? input.marketId ?? null : marketId,
    vendor_id: input.vendorId ?? null,
    rating: input.rating,
    body,
    verified_on_site: onSite,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "You already reviewed this. One review per listing." };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null, demo: false };
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

  return { error: null, demo: post.demo };
}

export async function flagItem(table: "posts" | "reviews", id: string) {
  const { supabase, user, demo } = await requireUser();
  if (demo || !supabase || !user) return { error: "Admins only." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { error: "Admins only." };
  const { error } = await supabase.from(table).update({ flagged: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { error: null };
}

export async function unflagItem(table: "posts" | "reviews", id: string) {
  const { supabase, user, demo } = await requireUser();
  if (demo || !supabase || !user) return { error: "Admins only." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { error: "Admins only." };
  const { error } = await supabase.from(table).update({ flagged: false }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}
