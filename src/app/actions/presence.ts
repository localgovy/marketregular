"use server";

import { isWithinGeofence } from "@/lib/geo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to post from a market.");
  return { supabase, user };
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

export async function createPost(input: {
  marketId: string;
  body: string;
  lat: number;
  lng: number;
  photos?: string[];
}) {
  const { supabase, user } = await requireUser();
  const body = input.body.trim();
  if (body.length < 3) return { error: "Write a little more." };
  if (body.length > 2000) return { error: "Posts are limited to 2,000 characters." };

  const ok = await verifyOnSite(supabase, input.marketId, input.lat, input.lng);
  if (!ok) {
    return { error: "You need to be at this market to post on the live feed." };
  }

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count ?? 0) >= 10) {
    return { error: "Daily post limit reached. See you tomorrow." };
  }

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    market_id: input.marketId,
    body,
    photos: input.photos ?? [],
    verified_on_site: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/search");
  return { error: null };
}

export async function createReview(input: {
  marketId?: string;
  vendorId?: string;
  rating: number;
  body: string;
  lat: number;
  lng: number;
}) {
  const { supabase, user } = await requireUser();
  const body = input.body.trim();
  if (!input.marketId && !input.vendorId) return { error: "Pick a market or vendor." };
  if (input.rating < 1 || input.rating > 5) return { error: "Rating must be 1–5." };
  if (body.length < 8) return { error: "Tell people a bit more about your visit." };

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

  const ok = await verifyOnSite(supabase, marketId, input.lat, input.lng);
  if (!ok) {
    return { error: "Reviews are for people actually at the market." };
  }

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id,
    market_id: input.vendorId ? input.marketId ?? null : marketId,
    vendor_id: input.vendorId ?? null,
    rating: input.rating,
    body,
    verified_on_site: true,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "You already reviewed this. One review per listing." };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
}

export async function flagItem(table: "posts" | "reviews", id: string) {
  const { supabase, user } = await requireUser();
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
  const { supabase, user } = await requireUser();
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
