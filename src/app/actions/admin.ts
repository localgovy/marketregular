"use server";

import { requireAdmin } from "@/lib/admin";
import { slugify, socialProfileHref } from "@/lib/format";
import {
  labelsFor,
  maintenanceBlockMessage,
  optOutsFromForm,
  readOptOuts,
  touchedMarketSections,
  touchedVendorSections,
  type MaintenanceKind,
  type MarketMaintenanceFields,
  type VendorMaintenanceFields,
} from "@/lib/maintenance-sections";
import { dbPublicError } from "@/lib/public-error";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { applyClaimDecision } from "@/lib/claim-approval";
import { sendMarketPortalMail } from "@/lib/market-portal-mail";
import { sendPortalDeclineMail } from "@/lib/portal-application-mail";
import { sendVendorPortalMail } from "@/lib/vendor-portal-mail";
import type { ClaimTarget } from "@/types/database";
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

function socialField(kind: "instagram" | "tiktok" | "facebook", value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const href = socialProfileHref(kind, raw);
  if (!href) fail("That link could not be saved.");
  return href;
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

function blank(value: unknown) {
  return typeof value === "string" && value !== "" ? value : null;
}

function tagList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function coord(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function maintenanceOverride(formData: FormData | undefined) {
  return formData?.get("maintenance_override") === "on";
}

function optOutsFromAdminForm(kind: MaintenanceKind, formData: FormData) {
  if (formData.get("maintenance_opt_outs_form") !== "1") return undefined;
  const parsed = optOutsFromForm(
    kind,
    formData.getAll("maintenance_opt_outs").map((value) => String(value)),
  );
  if (parsed === "bad") fail("That section is not on this page.");
  return parsed;
}

function vendorFields(row: {
  about?: unknown;
  logo_url?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  instagram?: unknown;
  tiktok?: unknown;
  facebook?: unknown;
  tags?: unknown;
}): VendorMaintenanceFields {
  return {
    about: blank(row.about),
    logo_url: blank(row.logo_url),
    phone: blank(row.phone),
    email: blank(row.email),
    website: blank(row.website),
    instagram: blank(row.instagram),
    tiktok: blank(row.tiktok),
    facebook: blank(row.facebook),
    tags: tagList(row.tags),
  };
}

function marketFields(row: {
  about?: unknown;
  logo_url?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  instagram?: unknown;
  tiktok?: unknown;
  facebook?: unknown;
  tags?: unknown;
  address?: unknown;
  city?: unknown;
  province?: unknown;
  postal_code?: unknown;
  lat?: unknown;
  lng?: unknown;
}): MarketMaintenanceFields {
  return {
    ...vendorFields(row),
    address: blank(row.address),
    city: blank(row.city),
    province: blank(row.province),
    postal_code: blank(row.postal_code),
    lat: coord(row.lat),
    lng: coord(row.lng),
  };
}

async function optOutsFor(
  supabase: SupabaseClient,
  table: "markets" | "vendors",
  id: string,
) {
  const kind: MaintenanceKind = table === "markets" ? "market" : "vendor";
  const { data, error } = await supabase
    .from(table)
    .select("maintenance_opt_outs")
    .eq("id", id)
    .maybeSingle();
  if (error) failDb(error, "Could not open that listing.");
  if (!data) fail(kind === "vendor" ? "That stall is missing." : "That market is missing.");
  return readOptOuts(kind, data.maintenance_opt_outs);
}

function refuseSections(
  groups: { labels: readonly string[]; noun: "stall" | "market" }[],
  formData: FormData | undefined,
) {
  if (maintenanceOverride(formData)) return;
  const message = maintenanceBlockMessage(groups);
  if (message) fail(message);
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
    const { data: current, error: readError } = await supabase
      .from("markets")
      .select(
        "slug, about, logo_url, phone, email, website, instagram, tiktok, facebook, tags, address, city, province, postal_code, lat, lng, maintenance_opt_outs",
      )
      .eq("id", id)
      .maybeSingle();
    if (readError) failDb(readError, "Could not save that market.");
    if (!current) fail("That market is missing.");
    const blocked = labelsFor(
      "market",
      touchedMarketSections(marketFields(current), marketFields(payload)).filter((key) =>
        readOptOuts("market", current.maintenance_opt_outs).includes(key),
      ),
    );
    refuseSections([{ labels: blocked, noun: "market" }], formData);
    const nextOptOuts = optOutsFromAdminForm("market", formData);
    const update = nextOptOuts === undefined ? payload : { ...payload, maintenance_opt_outs: nextOptOuts };
    const previous = current.slug ? `/markets/${current.slug}` : null;
    const { error } = await supabase.from("markets").update(update).eq("id", id);
    if (error) failDb(error, "Could not save that market.");
    revalidatePublishedDirectory(previous && previous !== nextPath ? [nextPath, previous] : [nextPath]);
  } else {
    const { error } = await supabase.from("markets").insert(payload);
    if (error) failDb(error, "Could not save that market.");
    revalidatePublishedDirectory([nextPath]);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/markets");
  revalidatePath("/admin/updates");
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
    instagram: socialField("instagram", formData.get("instagram")),
    tiktok: socialField("tiktok", formData.get("tiktok")),
    facebook: socialField("facebook", formData.get("facebook")),
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
    const { data: current, error: readError } = await supabase
      .from("vendors")
      .select(
        "slug, about, logo_url, phone, email, website, instagram, tiktok, facebook, tags, maintenance_opt_outs",
      )
      .eq("id", id)
      .maybeSingle();
    if (readError) failDb(readError, "Could not save that vendor.");
    if (!current) fail("That stall is missing.");
    const blocked = labelsFor(
      "vendor",
      touchedVendorSections(vendorFields(current), vendorFields(payload)).filter((key) =>
        readOptOuts("vendor", current.maintenance_opt_outs).includes(key),
      ),
    );
    refuseSections([{ labels: blocked, noun: "stall" }], formData);
    const nextOptOuts = optOutsFromAdminForm("vendor", formData);
    const update = nextOptOuts === undefined ? payload : { ...payload, maintenance_opt_outs: nextOptOuts };
    const previous = current.slug ? `/vendors/${current.slug}` : null;
    const { error } = await supabase.from("vendors").update(update).eq("id", id);
    if (error) failDb(error, "Could not save that vendor.");
    revalidatePublishedDirectory(previous && previous !== nextPath ? [nextPath, previous] : [nextPath]);
  } else {
    const { error } = await supabase.from("vendors").insert(payload);
    if (error) failDb(error, "Could not save that vendor.");
    revalidatePublishedDirectory([nextPath]);
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/updates");
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
  const opted = await optOutsFor(supabase, "markets", market_id);
  if (opted.includes("hours")) {
    refuseSections([{ labels: labelsFor("market", ["hours"]), noun: "market" }], formData);
  }
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

export async function deleteSchedule(id: string, marketId: string, formData?: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) fail("Supabase is not configured yet.");
  const opted = await optOutsFor(supabase, "markets", marketId);
  if (opted.includes("hours")) {
    refuseSections([{ labels: labelsFor("market", ["hours"]), noun: "market" }], formData);
  }
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
  const vendor_id = String(formData.get("vendor_id"));
  const [marketOpt, vendorOpt] = await Promise.all([
    optOutsFor(supabase, "markets", market_id),
    optOutsFor(supabase, "vendors", vendor_id),
  ]);
  refuseSections(
    [
      ...(vendorOpt.includes("halls")
        ? [{ labels: labelsFor("vendor", ["halls"]), noun: "stall" as const }]
        : []),
      ...(marketOpt.includes("roster")
        ? [{ labels: labelsFor("market", ["roster"]), noun: "market" as const }]
        : []),
    ],
    formData,
  );
  const { error } = await supabase.from("market_vendors").insert({
    market_id,
    vendor_id,
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
  const opted = await optOutsFor(supabase, "vendors", vendor_id);
  if (opted.includes("menu")) {
    refuseSections([{ labels: labelsFor("vendor", ["menu"]), noun: "stall" }], formData);
  }
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

const OWNER_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function assignVendorOwner(
  _prev: { error: string | null; message?: string } | undefined,
  formData: FormData,
): Promise<{ error: string | null; message?: string }> {
  const { supabase } = await requireAdmin();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const vendorId = String(formData.get("vendor_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!vendorId) return { error: "That stall is missing." };
  if (!OWNER_EMAIL.test(email) || email.length > 120) {
    return { error: "Add the email on their account." };
  }
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, slug, claimed_by")
    .eq("id", vendorId)
    .maybeSingle();
  if (vendorError) return { error: dbPublicError(vendorError, "Could not open that stall.") };
  if (!vendor) return { error: "That stall is missing." };

  const { data: userId, error: lookupError } = await supabase.rpc("auth_user_id_for_email", {
    p_email: email,
  });
  if (lookupError) return { error: "Could not look up that account." };
  if (!userId) {
    return { error: "No account uses that email. They need to sign up at /vendor first." };
  }
  if (vendor.claimed_by && vendor.claimed_by !== userId) {
    return { error: "Someone else already runs this stall." };
  }

  if (vendor.claimed_by !== userId) {
    const { data: updated, error: claimError } = await supabase
      .from("vendors")
      .update({ claimed_by: userId })
      .eq("id", vendorId)
      .is("claimed_by", null)
      .select("id");
    if (claimError) return { error: dbPublicError(claimError, "Could not give them this stall.") };
    if (!updated?.length) return { error: "Someone else already runs this stall." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (profile?.role !== "admin") {
      const { error: roleError } = await supabase.from("profiles").update({ role: "vendor" }).eq("id", userId);
      if (roleError) return { error: dbPublicError(roleError, "Could not open the stall editor.") };
    }
  }

  const mailed = await sendVendorPortalMail(email);
  revalidatePublishedDirectory([`/vendors/${vendor.slug}`, "/vendor"]);
  revalidatePath(`/admin/vendors/${vendorId}`);
  await closePendingApplication(supabase, userId, "vendor", vendorId);
  revalidatePath("/admin/applications");
  if (!mailed.sent) {
    return { error: "They can edit this stall. The email did not send." };
  }
  return { error: null, message: "They can edit this stall. We emailed the portal link." };
}

export async function assignMarketOwner(
  _prev: { error: string | null; message?: string } | undefined,
  formData: FormData,
): Promise<{ error: string | null; message?: string }> {
  const { supabase } = await requireAdmin();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const marketId = String(formData.get("market_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!marketId) return { error: "That market is missing." };
  if (!OWNER_EMAIL.test(email) || email.length > 120) {
    return { error: "Add the email on their account." };
  }
  const { data: market, error: marketError } = await supabase
    .from("markets")
    .select("id, slug, claimed_by")
    .eq("id", marketId)
    .maybeSingle();
  if (marketError) return { error: dbPublicError(marketError, "Could not open that market.") };
  if (!market) return { error: "That market is missing." };

  const { data: userId, error: lookupError } = await supabase.rpc("auth_user_id_for_email", {
    p_email: email,
  });
  if (lookupError) return { error: "Could not look up that account." };
  if (!userId) {
    return { error: "No account uses that email. They need to sign up at /market first." };
  }
  if (market.claimed_by && market.claimed_by !== userId) {
    return { error: "Someone else already runs this market." };
  }

  if (market.claimed_by !== userId) {
    const { data: updated, error: claimError } = await supabase
      .from("markets")
      .update({ claimed_by: userId })
      .eq("id", marketId)
      .is("claimed_by", null)
      .select("id");
    if (claimError) return { error: dbPublicError(claimError, "Could not give them this market.") };
    if (!updated?.length) return { error: "Someone else already runs this market." };
  }

  const mailed = await sendMarketPortalMail(email);
  revalidatePublishedDirectory([`/markets/${market.slug}`, "/market"]);
  revalidatePath(`/admin/markets/${marketId}`);
  await closePendingApplication(supabase, userId, "market", marketId);
  revalidatePath("/admin/applications");
  if (!mailed.sent) {
    return { error: "They can edit this market. The email did not send." };
  }
  return { error: null, message: "They can edit this market. We emailed the portal link." };
}

export async function decideClaim(
  id: string,
  status: "approved" | "rejected",
  note?: string,
): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const result = await applyClaimDecision(supabase, { id, status, note }, (email, password, kind) =>
    kind === "market" ? sendMarketPortalMail(email, password) : sendVendorPortalMail(email, password),
  );
  if (result.committed) {
    revalidatePublishedDirectory(result.paths);
    if (result.vendorId) revalidatePath(`/admin/vendors/${result.vendorId}`);
    if (result.marketId) revalidatePath(`/admin/markets/${result.marketId}`);
    revalidatePath("/market");
    revalidatePath("/vendor");
    revalidatePath("/admin/applications");
  }
  if (result.mailFailed) {
    const params = new URLSearchParams({
      sent: "0",
      password: result.mailFailed.password,
    });
    if (result.mailFailed.vendorId) params.set("vendor", result.mailFailed.vendorId);
    if (result.mailFailed.marketId) params.set("market", result.mailFailed.marketId);
    redirect(`/admin/claims?${params}`);
  }
  return { error: result.error };
}

const APPLICATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function closePendingApplication(
  supabase: SupabaseClient,
  userId: string,
  kind: ClaimTarget,
  targetId: string,
) {
  const { error } = await supabase
    .from("portal_applications")
    .update({ status: "approved", assigned_target_id: targetId })
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("status", "pending");
  if (error) console.error("admin.closeApplication", error.message);
}

export type ApplicationDecision = {
  error: string | null;
  message?: string;
  matches?: { id: string; name: string; slug: string; status: string }[];
};

export async function decideApplication(
  _prev: ApplicationDecision | undefined,
  formData: FormData,
): Promise<ApplicationDecision> {
  const { supabase } = await requireAdmin();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const id = String(formData.get("application_id") ?? "");
  if (!APPLICATION_ID.test(id)) return { error: "That request is missing." };
  const intent = String(formData.get("intent") ?? "");
  const { data: app, error: appError } = await supabase
    .from("portal_applications")
    .select("id, user_id, kind, status")
    .eq("id", id)
    .maybeSingle();
  if (appError) return { error: dbPublicError(appError, "Could not open that request.") };
  if (!app || (app.kind !== "vendor" && app.kind !== "market")) {
    return { error: "That request is missing." };
  }
  const kind = app.kind as ClaimTarget;

  if (intent === "find") {
    const q = String(formData.get("q") ?? "")
      .trim()
      .replace(/[%_\\,]/g, "")
      .slice(0, 80);
    if (q.length < 2) return { error: "Type more of the name." };
    const table = kind === "vendor" ? "vendors" : "markets";
    const { data, error } = await supabase
      .from(table)
      .select("id, name, slug, status")
      .ilike("name", `%${q}%`)
      .order("name")
      .limit(15);
    if (error) return { error: dbPublicError(error, "Could not search listings.") };
    const matches = (data ?? []).flatMap((row) => {
      if (!row.id || !row.name || !row.slug) return [];
      return [{ id: row.id, name: row.name, slug: row.slug, status: row.status ?? "draft" }];
    });
    if (!matches.length) return { error: "No listings match that name.", matches: [] };
    return { error: null, matches };
  }

  if (intent === "reject") {
    if (app.status !== "pending") return { error: "That request is already decided." };
    const { error } = await supabase.rpc("reject_portal_application", { p_id: id });
    if (error) return { error: dbPublicError(error, "Could not turn down that request.") };
    const { data: account } = await supabase.auth.admin.getUserById(app.user_id);
    const mailed = account.user?.email
      ? await sendPortalDeclineMail(account.user.email, kind)
      : { sent: false };
    revalidatePath("/admin/applications");
    revalidatePath(kind === "vendor" ? "/vendor" : "/market");
    revalidatePath("/account");
    if (!mailed.sent) return { error: "The request is turned down. The email did not send." };
    return { error: null, message: "Turned down. We emailed them." };
  }

  const targetId = String(formData.get("target_id") ?? "");
  if (!APPLICATION_ID.test(targetId)) return { error: "Choose a listing." };
  if (app.status !== "pending") return { error: "That request is already decided." };
  const { error } = await supabase.rpc("assign_portal_application", {
    p_id: id,
    p_target_id: targetId,
  });
  if (error) return { error: dbPublicError(error, "Could not assign that listing.") };

  const table = kind === "vendor" ? "vendors" : "markets";
  const { data: listing } = await supabase.from(table).select("slug").eq("id", targetId).maybeSingle();
  const { data: account } = await supabase.auth.admin.getUserById(app.user_id);
  const mailed = account.user?.email
    ? kind === "vendor"
      ? await sendVendorPortalMail(account.user.email)
      : await sendMarketPortalMail(account.user.email)
    : { sent: false };
  const publicPath = listing?.slug
    ? kind === "vendor"
      ? `/vendors/${listing.slug}`
      : `/markets/${listing.slug}`
    : null;
  revalidatePublishedDirectory(publicPath ? [publicPath, kind === "vendor" ? "/vendor" : "/market"] : [kind === "vendor" ? "/vendor" : "/market"]);
  revalidatePath(kind === "vendor" ? `/admin/vendors/${targetId}` : `/admin/markets/${targetId}`);
  revalidatePath(kind === "vendor" ? `/vendor/${targetId}` : `/market/${targetId}`);
  revalidatePath("/admin/applications");
  revalidatePath("/account");
  if (!mailed.sent) {
    return {
      error:
        kind === "vendor"
          ? "They can edit this stall. The email did not send."
          : "They can edit this market. The email did not send.",
    };
  }
  return {
    error: null,
    message:
      kind === "vendor"
        ? "They can edit this stall. We emailed the portal link."
        : "They can edit this market. We emailed the portal link.",
  };
}
