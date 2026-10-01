"use server";

import { requireAdmin } from "@/lib/admin";
import { slugify } from "@/lib/format";
import { dbPublicError } from "@/lib/public-error";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

function fail(message: string): never {
  throw new Error(message);
}

function failDb(error: { message?: string; code?: string }, fallback: string): never {
  console.error("admin", error.message);
  throw new Error(dbPublicError(error, fallback));
}

function listingSlug(raw: FormDataEntryValue | null, name: string) {
  return slugify(String(raw ?? "").trim()) || slugify(name);
}

function listingStatus(value: FormDataEntryValue | null): "draft" | "published" {
  return value === "published" ? "published" : "draft";
}

function geofenceMetres(value: FormDataEntryValue | null) {
  const n = Number(value || 250);
  return Number.isFinite(n) && n > 0 && n < 100_000 ? Math.round(n) : 250;
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
  const slug = listingSlug(formData.get("slug"), name);
  if (!slug) fail("Add a name.");
  const payload = {
    name,
    slug,
    about: String(formData.get("about") ?? "") || null,
    address: String(formData.get("address") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
    postal_code: String(formData.get("postal_code") ?? "") || null,
    lat: coordOrNull(formData.get("lat")),
    lng: coordOrNull(formData.get("lng")),
    geofence_radius_m: geofenceMetres(formData.get("geofence_radius_m")),
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
    status: listingStatus(formData.get("status")),
    featured: formData.get("featured") === "on",
    ...parseReviewStats(formData),
  };

  const nextPath = `/markets/${payload.slug}`;
  if (id) {
    const previous = await listingPath(supabase, "markets", id);
    const { error } = await supabase.from("markets").update(payload).eq("id", id);
    if (error) failDb(error, "Could not save that market.");
    revalidatePublishedDirectory(previous && previous !== nextPath ? [nextPath, previous] : [nextPath]);
  } else {
    const { error } = await supabase.from("markets").insert(payload);
    if (error) failDb(error, "Could not save that market.");
    revalidatePublishedDirectory([nextPath]);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/markets");
  redirect("/admin/markets");
}

export async function deleteMarket(id: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const path = await listingPath(supabase, "markets", id);
  const { error } = await supabase.from("markets").delete().eq("id", id);
  if (error) failDb(error, "Could not delete that market.");
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath("/admin/markets");
  redirect("/admin/markets");
}

export async function saveVendor(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = listingSlug(formData.get("slug"), name);
  if (!slug) fail("Add a name.");
  const payload = {
    name,
    slug,
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
    status: listingStatus(formData.get("status")),
    ...parseReviewStats(formData),
  };
  const nextPath = `/vendors/${payload.slug}`;
  if (id) {
    const previous = await listingPath(supabase, "vendors", id);
    const { error } = await supabase.from("vendors").update(payload).eq("id", id);
    if (error) failDb(error, "Could not save that vendor.");
    revalidatePublishedDirectory(previous && previous !== nextPath ? [nextPath, previous] : [nextPath]);
  } else {
    const { error } = await supabase.from("vendors").insert(payload);
    if (error) failDb(error, "Could not save that vendor.");
    revalidatePublishedDirectory([nextPath]);
  }
  revalidatePath("/admin/vendors");
  redirect("/admin/vendors");
}

export async function deleteVendor(id: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const path = await listingPath(supabase, "vendors", id);
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) failDb(error, "Could not delete that vendor.");
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
  if (error) failDb(error, "Could not save that schedule.");
  const path = await listingPath(supabase, "markets", market_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath(`/admin/markets/${market_id}`);
}

export async function deleteSchedule(id: string, marketId: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const { error } = await supabase.from("market_schedules").delete().eq("id", id);
  if (error) failDb(error, "Could not delete that schedule.");
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
      .map((d) => d.trim())
      .filter((d) => d !== "")
      .map((d) => Number(d))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
  });
  if (error) failDb(error, "Could not link that vendor.");
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
  if (error) failDb(error, "Could not save that menu item.");
  const path = await listingPath(supabase, "vendors", vendor_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath(`/admin/vendors/${vendor_id}`);
}

export async function decideClaim(id: string, status: "approved" | "rejected", note?: string) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  if (status !== "approved" && status !== "rejected") fail("Could not update that claim.");
  const { data: claim, error: lookupError } = await supabase
    .from("claim_requests")
    .select("target_type, target_id")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) failDb(lookupError, "Could not update that claim.");
  if (!claim) fail("Claim not found");
  const clipped = (note ?? "").trim().slice(0, 500);
  const { error } = await supabase.rpc("decide_claim", {
    p_id: id,
    p_status: status,
    p_note: clipped || null,
  });
  if (error) failDb(error, "Could not update that claim.");
  const table = claim.target_type === "market" ? "markets" : "vendors";
  const path = await listingPath(supabase, table, claim.target_id);
  revalidatePublishedDirectory(path ? [path] : []);
  revalidatePath("/admin/claims");
}
