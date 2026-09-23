"use server";

import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/format";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

function fail(message: string): never {
  throw new Error(message);
}

function coordOrNull(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function listingPath(
  supabase: SupabaseClient,
  table: "markets" | "vendors",
  id: string,
) {
  const { data } = await supabase.from(table).select("slug").eq("id", id).maybeSingle();
  const slug = typeof data?.slug === "string" ? data.slug : "";
  if (!slug) return null;
  return table === "markets" ? `/markets/${slug}` : `/vendors/${slug}`;
}

function parseReviewStats(formData: FormData) {
  const countRaw = String(formData.get("review_count") ?? "").trim();
  const avgRaw = String(formData.get("rating_avg") ?? "").trim();
  const review_count = countRaw === "" ? 0 : Math.max(0, Math.floor(Number(countRaw)));
  const avg = avgRaw === "" ? Number.NaN : Number(avgRaw);
  return {
    review_count: Number.isFinite(review_count) ? review_count : 0,
    rating_avg:
      Number.isFinite(avg) && avg >= 1 && avg <= 5 ? Math.round(avg * 100) / 100 : null,
  };
}

export async function saveMarket(formData: FormData) {
  const { supabase, error: adminError } = await requireAdmin();
  if (!supabase) fail(adminError === "supabase" ? "Supabase is not configured yet." : "Admins only.");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const payload = {
    name,
    slug: String(formData.get("slug") ?? "") || slugify(name),
    about: String(formData.get("about") ?? "") || null,
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
    postal_code: String(formData.get("postal_code") ?? "") || null,
    lat: coordOrNull(formData.get("lat")),
    lng: coordOrNull(formData.get("lng")),
    geofence_radius_m: Number(formData.get("geofence_radius_m") || 250),
    website: String(formData.get("website") ?? "") || null,
    instagram: String(formData.get("instagram") ?? "") || null,
    tiktok: String(formData.get("tiktok") ?? "") || null,
    facebook: String(formData.get("facebook") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    status: String(formData.get("status") ?? "draft") as "draft" | "published",
    featured: formData.get("featured") === "on",
    ...parseReviewStats(formData),
  };

  if (id) {
    const { error } = await supabase.from("markets").update(payload).eq("id", id);
    if (error) fail(error.message);
  } else {
    const { error } = await supabase.from("markets").insert(payload);
    if (error) fail(error.message);
  }
  revalidatePublishedDirectory([`/markets/${payload.slug}`]);
  revalidatePath("/admin");
  revalidatePath("/admin/markets");
  redirect("/admin/markets");
}

export async function deleteMarket(id: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const path = await listingPath(supabase, "markets", id);
  const { error } = await supabase.from("markets").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath("/admin/markets");
  redirect("/admin/markets");
}

export async function saveVendor(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const payload = {
    name,
    slug: String(formData.get("slug") ?? "") || slugify(name),
    about: String(formData.get("about") ?? "") || null,
    website: String(formData.get("website") ?? "") || null,
    instagram: String(formData.get("instagram") ?? "") || null,
    tiktok: String(formData.get("tiktok") ?? "") || null,
    facebook: String(formData.get("facebook") ?? "") || null,
    phone: String(formData.get("phone") ?? "") || null,
    email: String(formData.get("email") ?? "").trim() || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    status: String(formData.get("status") ?? "draft") as "draft" | "published",
    ...parseReviewStats(formData),
  };
  if (id) {
    const { error } = await supabase.from("vendors").update(payload).eq("id", id);
    if (error) fail(error.message);
  } else {
    const { error } = await supabase.from("vendors").insert(payload);
    if (error) fail(error.message);
  }
  revalidatePublishedDirectory([`/vendors/${payload.slug}`]);
  revalidatePath("/admin/vendors");
  redirect("/admin/vendors");
}

export async function deleteVendor(id: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const path = await listingPath(supabase, "vendors", id);
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath("/admin/vendors");
  redirect("/admin/vendors");
}

export async function saveSchedule(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const market_id = String(formData.get("market_id"));
  const { error } = await supabase.from("market_schedules").insert({
    market_id,
    weekday: Number(formData.get("weekday")),
    opens_at: String(formData.get("opens_at")),
    closes_at: String(formData.get("closes_at")),
    season_start: String(formData.get("season_start") ?? "") || null,
    season_end: String(formData.get("season_end") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null,
  });
  if (error) fail(error.message);
  const path = await listingPath(supabase, "markets", market_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath(`/admin/markets/${market_id}`);
}

export async function deleteSchedule(id: string, marketId: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const { error } = await supabase.from("market_schedules").delete().eq("id", id);
  if (error) fail(error.message);
  const path = await listingPath(supabase, "markets", marketId);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath(`/admin/markets/${marketId}`);
}

export async function linkVendorToMarket(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const market_id = String(formData.get("market_id"));
  const { error } = await supabase.from("market_vendors").insert({
    market_id,
    vendor_id: String(formData.get("vendor_id")),
    stall: String(formData.get("stall") ?? "") || null,
    days: String(formData.get("days") ?? "")
      .split(",")
      .map((d) => Number(d.trim()))
      .filter((n) => !Number.isNaN(n)),
  });
  if (error) fail(error.message);
  const path = await listingPath(supabase, "markets", market_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath(`/admin/markets/${market_id}`);
}

export async function saveMenuItem(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const vendor_id = String(formData.get("vendor_id"));
  const price = String(formData.get("price_cents") ?? "");
  const { error } = await supabase.from("vendor_menus").insert({
    vendor_id,
    name: String(formData.get("name")),
    description: String(formData.get("description") ?? "") || null,
    price_cents: price ? Math.round(Number(price) * 100) : null,
    season: String(formData.get("season") ?? "") || null,
    dietary: String(formData.get("dietary") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  });
  if (error) fail(error.message);
  const path = await listingPath(supabase, "vendors", vendor_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath(`/admin/vendors/${vendor_id}`);
}

export async function decideClaim(id: string, status: "approved" | "rejected", note?: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const { data: claim, error: lookupError } = await supabase
    .from("claim_requests")
    .select("target_type, target_id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) fail(lookupError.message);
  if (!claim) fail("Claim not found");
  const { error } = await supabase.rpc("decide_claim", {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) fail(error.message);
  const table = claim.target_type === "market" ? "markets" : "vendors";
  const path = await listingPath(supabase, table, claim.target_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath("/admin/claims");
}
