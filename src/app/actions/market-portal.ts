"use server";

import { dbPublicError } from "@/lib/public-error";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import {
  createdStallLogoObjectName,
  marketLogoObjectName,
  parseMarketPortal,
  portalHours,
  portalSeason,
  type MarketPortalListing,
  type PortalVendorHit,
} from "@/lib/market-portal";
import { mustSetPassword } from "@/lib/password-gate";
import {
  imageKind,
  isUuid,
  portalListingHref,
  portalSocialHref,
  type PortalResult,
} from "@/lib/vendor-portal";

const LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_CONTENT: Record<"jpg" | "png" | "webp", string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function portalError(
  error: { message?: string; code?: string } | null,
  fallback: string,
): PortalResult {
  if (error?.code === "42501") return { error: "That market is not yours." };
  return { error: dbPublicError(error, fallback) };
}

async function session() {
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return { supabase: null, user: null };
  return { supabase, user };
}

async function loadOwned(
  supabase: NonNullable<Awaited<ReturnType<typeof session>>["supabase"]>,
  id: string,
) {
  const { data, error } = await supabase.rpc("my_market_portal");
  if (error) return { listing: null, error };
  return { listing: parseMarketPortal(data).find((row) => row.id === id) ?? null, error: null };
}

function revalidateListing(listing: MarketPortalListing, extra: string[] = []) {
  revalidatePublishedDirectory([
    `/markets/${listing.slug}`,
    "/market",
    `/market/${listing.id}`,
    ...listing.stalls.map((stall) => `/vendors/${stall.vendor_slug}`),
    ...extra,
  ]);
}

async function requireOwned(id: string) {
  const { supabase, user } = await session();
  if (!supabase || !user) return { error: "Sign in first." as const, supabase: null, user: null };
  if (mustSetPassword(user.app_metadata)) {
    return { error: "Set a password first." as const, supabase: null, user: null };
  }
  if (!isUuid(id)) return { error: "That market is missing." as const, supabase: null, user: null };
  const { data, error } = await supabase.rpc("owns_market", { p_id: id });
  if (error || data !== true) {
    return { error: "That market is not yours." as const, supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function tagsOf(formData: FormData) {
  return formData
    .getAll("tags")
    .map((value) => String(value))
    .filter(Boolean);
}

function daysOf(formData: FormData) {
  return formData
    .getAll("days")
    .map((value) => Number(value))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

function linksOf(formData: FormData): { error: string } | {
  website: string;
  instagram: string;
  tiktok: string;
  facebook: string;
} {
  const website = portalListingHref(text(formData, "website"));
  if (website === "bad") return { error: "That link could not be saved." };
  const instagram = portalSocialHref("instagram", text(formData, "instagram"));
  const tiktok = portalSocialHref("tiktok", text(formData, "tiktok"));
  const facebook = portalSocialHref("facebook", text(formData, "facebook"));
  if (instagram === "bad" || tiktok === "bad" || facebook === "bad") {
    return { error: "That link could not be saved." };
  }
  return {
    website: website ?? "",
    instagram: instagram ?? "",
    tiktok: tiktok ?? "",
    facebook: facebook ?? "",
  };
}

export async function loadMarketPortal() {
  const { supabase, user } = await session();
  if (!supabase || !user) return { listings: [] as MarketPortalListing[], signedIn: false };
  const { data, error } = await supabase.rpc("my_market_portal");
  if (error) return { listings: [] as MarketPortalListing[], signedIn: true, error: true as const };
  return { listings: parseMarketPortal(data), signedIn: true, error: false as const };
}

export async function saveOwnedMarket(formData: FormData): Promise<PortalResult> {
  const id = text(formData, "market_id");
  const gate = await requireOwned(id);
  if (!gate.supabase) return { error: gate.error };
  const links = linksOf(formData);
  if ("error" in links) return { error: links.error };
  const { error } = await gate.supabase.rpc("save_owned_market", {
    p_id: id,
    p_name: text(formData, "name"),
    p_about: text(formData, "about"),
    p_address: text(formData, "address"),
    p_city: text(formData, "city"),
    p_province: text(formData, "province"),
    p_postal_code: text(formData, "postal_code"),
    p_website: links.website,
    p_instagram: links.instagram,
    p_tiktok: links.tiktok,
    p_facebook: links.facebook,
    p_phone: text(formData, "phone"),
    p_email: text(formData, "email"),
    p_tags: tagsOf(formData),
  });
  if (error) return portalError(error, "Could not save that market.");
  const loaded = await loadOwned(gate.supabase, id);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: "Saved." };
}

export async function saveOwnedSchedule(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase) return { error: gate.error };
  const scheduleId = text(formData, "schedule_id").trim();
  if (scheduleId && !isUuid(scheduleId)) return { error: "Those hours are missing." };
  const hours = portalHours(text(formData, "opens_at"), text(formData, "closes_at"));
  if (hours === "bad") return { error: "Open has to be before close." };
  const season = portalSeason(text(formData, "season_start"), text(formData, "season_end"));
  if (season === "bad") return { error: "That season is not allowed." };
  const weekday = Number(text(formData, "weekday"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { error: "Those hours are not allowed." };
  }
  const { error } = await gate.supabase.rpc("save_owned_schedule", {
    p_market_id: marketId,
    p_schedule_id: scheduleId || null,
    p_weekday: weekday,
    p_opens: hours.opens,
    p_closes: hours.closes,
    p_season_start: season.start,
    p_season_end: season.end,
    p_notes: text(formData, "notes"),
  });
  if (error) return portalError(error, "Could not save those hours.");
  const loaded = await loadOwned(gate.supabase, marketId);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: scheduleId ? "Saved." : "Added." };
}

export async function deleteOwnedSchedule(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const scheduleId = text(formData, "schedule_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(scheduleId)) return { error: "Those hours are missing." };
  const { error } = await gate.supabase.rpc("delete_owned_schedule", {
    p_market_id: marketId,
    p_schedule_id: scheduleId,
  });
  if (error) return portalError(error, "Could not remove those hours.");
  const loaded = await loadOwned(gate.supabase, marketId);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: "Removed." };
}

export async function saveMarketRoster(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const vendorId = text(formData, "vendor_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(vendorId)) return { error: "That stall is missing." };
  const days = daysOf(formData);
  if (days.length === 0) return { error: "Pick at least one day the market is open." };
  const { error } = await gate.supabase.rpc("save_market_roster", {
    p_market_id: marketId,
    p_vendor_id: vendorId,
    p_stall: text(formData, "stall"),
    p_days: days,
  });
  if (error) return portalError(error, "Could not save that stall.");
  const loaded = await loadOwned(gate.supabase, marketId);
  const vendorSlug = text(formData, "vendor_slug");
  if (loaded.listing) {
    revalidateListing(loaded.listing, vendorSlug ? [`/vendors/${vendorSlug}`] : []);
  }
  return { error: null, message: "Saved." };
}

export async function deleteMarketRoster(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const vendorId = text(formData, "vendor_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(vendorId)) return { error: "That stall is missing." };
  const before = await loadOwned(gate.supabase, marketId);
  const previous = before.listing?.stalls.find((stall) => stall.vendor_id === vendorId);
  const { error } = await gate.supabase.rpc("delete_market_roster", {
    p_market_id: marketId,
    p_vendor_id: vendorId,
  });
  if (error) return portalError(error, "Could not remove that stall.");
  const loaded = await loadOwned(gate.supabase, marketId);
  if (loaded.listing) {
    revalidateListing(loaded.listing, previous ? [`/vendors/${previous.vendor_slug}`] : []);
  }
  if (previous?.logo_url && previous.editable) {
    const service = createServiceClient();
    if (service) {
      const { data: still } = await service.from("vendors").select("id").eq("id", vendorId).maybeSingle();
      const objectName = createdStallLogoObjectName(vendorId, previous.logo_url);
      if (!still && objectName) await service.storage.from("listing-marks").remove([objectName]);
    }
  }
  return { error: null, message: "Removed." };
}

export async function createMarketVendor(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase) return { error: gate.error };
  const links = linksOf(formData);
  if ("error" in links) return { error: links.error };
  const days = daysOf(formData);
  if (days.length === 0) return { error: "Pick at least one day the market is open." };
  const { error } = await gate.supabase.rpc("create_market_vendor", {
    p_market_id: marketId,
    p_name: text(formData, "name"),
    p_about: text(formData, "about"),
    p_website: links.website,
    p_instagram: links.instagram,
    p_tiktok: links.tiktok,
    p_facebook: links.facebook,
    p_phone: text(formData, "phone"),
    p_email: text(formData, "email"),
    p_tags: tagsOf(formData),
    p_stall: text(formData, "stall"),
    p_days: days,
  });
  if (error) return portalError(error, "Could not add that stall.");
  const loaded = await loadOwned(gate.supabase, marketId);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: "Added." };
}

export async function saveMarketVendorProfile(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const vendorId = text(formData, "vendor_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(vendorId)) return { error: "That stall is missing." };
  const links = linksOf(formData);
  if ("error" in links) return { error: links.error };
  const { error } = await gate.supabase.rpc("save_market_vendor_profile", {
    p_market_id: marketId,
    p_vendor_id: vendorId,
    p_name: text(formData, "name"),
    p_about: text(formData, "about"),
    p_website: links.website,
    p_instagram: links.instagram,
    p_tiktok: links.tiktok,
    p_facebook: links.facebook,
    p_phone: text(formData, "phone"),
    p_email: text(formData, "email"),
    p_tags: tagsOf(formData),
  });
  if (error) return portalError(error, "Could not save that stall.");
  const loaded = await loadOwned(gate.supabase, marketId);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: "Saved." };
}

async function storeLogo(
  bytes: Uint8Array,
  kind: "jpg" | "png" | "webp",
  objectName: string,
) {
  const service = createServiceClient();
  if (!service) return { error: "Could not save that image." as const, service: null, url: null };
  const { error: uploadError } = await service.storage.from("listing-marks").upload(objectName, bytes, {
    contentType: LOGO_CONTENT[kind],
    upsert: false,
  });
  if (uploadError) return { error: "Could not save that image." as const, service: null, url: null };
  const { data: pub } = service.storage.from("listing-marks").getPublicUrl(objectName);
  return { error: null, service, url: pub.publicUrl };
}

export async function uploadOwnedMarketLogo(formData: FormData): Promise<PortalResult> {
  const id = text(formData, "market_id");
  const gate = await requireOwned(id);
  if (!gate.supabase || !gate.user) return { error: gate.error ?? "Sign in first." };
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > LOGO_BYTES) return { error: "Use an image under 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) return { error: "Use a JPEG, PNG, or WebP image." };

  const before = await loadOwned(gate.supabase, id);
  const objectName = `markets/${id}/${crypto.randomUUID()}.${kind}`;
  const stored = await storeLogo(bytes, kind, objectName);
  if (!stored.service || !stored.url) return { error: stored.error ?? "Could not save that image." };
  if (marketLogoObjectName(id, stored.url) !== objectName) {
    await stored.service.storage.from("listing-marks").remove([objectName]);
    return { error: "Could not save that image." };
  }

  const { data: updated, error } = await stored.service
    .from("markets")
    .update({ logo_url: stored.url })
    .eq("id", id)
    .eq("claimed_by", gate.user.id)
    .select("id");
  if (error || !updated?.length) {
    await stored.service.storage.from("listing-marks").remove([objectName]);
    return { error: "Could not save that image." };
  }

  const previous = before.listing?.logo_url;
  if (previous) {
    const previousName = marketLogoObjectName(id, previous);
    if (previousName && previousName !== objectName) {
      await stored.service.storage.from("listing-marks").remove([previousName]);
    }
  }
  if (before.listing) revalidateListing({ ...before.listing, logo_url: stored.url });
  return { error: null, message: "Saved." };
}

export async function clearOwnedMarketLogo(formData: FormData): Promise<PortalResult> {
  const id = text(formData, "market_id");
  const gate = await requireOwned(id);
  if (!gate.supabase || !gate.user) return { error: gate.error ?? "Sign in first." };
  const before = await loadOwned(gate.supabase, id);
  const service = createServiceClient();
  if (!service) return { error: "Could not remove that image." };
  const { data: updated, error } = await service
    .from("markets")
    .update({ logo_url: null })
    .eq("id", id)
    .eq("claimed_by", gate.user.id)
    .select("id");
  if (error || !updated?.length) return { error: "Could not remove that image." };
  const previous = before.listing?.logo_url;
  if (previous) {
    const previousName = marketLogoObjectName(id, previous);
    if (previousName) await service.storage.from("listing-marks").remove([previousName]);
  }
  if (before.listing) revalidateListing({ ...before.listing, logo_url: null });
  return { error: null, message: "Removed." };
}

export async function uploadMarketVendorLogo(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const vendorId = text(formData, "vendor_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase || !gate.user) return { error: gate.error ?? "Sign in first." };
  if (!isUuid(vendorId)) return { error: "That stall is missing." };
  const before = await loadOwned(gate.supabase, marketId);
  const stall = before.listing?.stalls.find((row) => row.vendor_id === vendorId);
  if (!stall?.editable) return { error: "That stall is not yours to edit." };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > LOGO_BYTES) return { error: "Use an image under 5 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) return { error: "Use a JPEG, PNG, or WebP image." };

  const objectName = `vendors/${vendorId}/${crypto.randomUUID()}.${kind}`;
  const stored = await storeLogo(bytes, kind, objectName);
  if (!stored.service || !stored.url) return { error: stored.error ?? "Could not save that image." };
  if (createdStallLogoObjectName(vendorId, stored.url) !== objectName) {
    await stored.service.storage.from("listing-marks").remove([objectName]);
    return { error: "Could not save that image." };
  }

  const { data: updated, error } = await stored.service
    .from("vendors")
    .update({ logo_url: stored.url })
    .eq("id", vendorId)
    .eq("created_by_market_id", marketId)
    .is("claimed_by", null)
    .select("id");
  if (error || !updated?.length) {
    await stored.service.storage.from("listing-marks").remove([objectName]);
    return { error: "Could not save that image." };
  }

  if (stall.logo_url) {
    const previousName = createdStallLogoObjectName(vendorId, stall.logo_url);
    if (previousName && previousName !== objectName) {
      await stored.service.storage.from("listing-marks").remove([previousName]);
    }
  }
  if (before.listing) revalidateListing(before.listing, [`/vendors/${stall.vendor_slug}`]);
  return { error: null, message: "Saved." };
}

export async function clearMarketVendorLogo(formData: FormData): Promise<PortalResult> {
  const marketId = text(formData, "market_id");
  const vendorId = text(formData, "vendor_id");
  const gate = await requireOwned(marketId);
  if (!gate.supabase || !gate.user) return { error: gate.error ?? "Sign in first." };
  if (!isUuid(vendorId)) return { error: "That stall is missing." };
  const before = await loadOwned(gate.supabase, marketId);
  const stall = before.listing?.stalls.find((row) => row.vendor_id === vendorId);
  if (!stall?.editable) return { error: "That stall is not yours to edit." };
  const service = createServiceClient();
  if (!service) return { error: "Could not remove that image." };
  const { data: updated, error } = await service
    .from("vendors")
    .update({ logo_url: null })
    .eq("id", vendorId)
    .eq("created_by_market_id", marketId)
    .is("claimed_by", null)
    .select("id");
  if (error || !updated?.length) return { error: "Could not remove that image." };
  if (stall.logo_url) {
    const previousName = createdStallLogoObjectName(vendorId, stall.logo_url);
    if (previousName) await service.storage.from("listing-marks").remove([previousName]);
  }
  if (before.listing) revalidateListing(before.listing, [`/vendors/${stall.vendor_slug}`]);
  return { error: null, message: "Removed." };
}

export async function searchPortalVendors(
  query: string,
): Promise<{ error: string | null; vendors: PortalVendorHit[] }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { error: "Sign in first.", vendors: [] };
  if (mustSetPassword(user.app_metadata)) return { error: "Set a password first.", vendors: [] };
  const { data: owns, error: ownsError } = await supabase.rpc("has_owned_market");
  if (ownsError || owns !== true) return { error: "That market is not yours.", vendors: [] };

  const q = query.trim().slice(0, 80);
  if (q.length < 2) return { error: null, vendors: [] };
  const needle = q.replace(/[%_\\]/g, "");
  if (needle.length < 2) return { error: null, vendors: [] };

  const service = createServiceClient();
  if (!service) return { error: "Could not search stalls.", vendors: [] };
  const { data, error } = await service
    .from("vendors")
    .select("id, name, slug")
    .eq("status", "published")
    .ilike("name", `%${needle}%`)
    .order("name")
    .limit(12);
  if (error) return { error: "Could not search stalls.", vendors: [] };
  return {
    error: null,
    vendors: ((data ?? []) as PortalVendorHit[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
    })),
  };
}
