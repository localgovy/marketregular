"use server";

import { dbPublicError } from "@/lib/public-error";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import {
  isUuid,
  ownedLogoObjectName,
  parseVendorPortal,
  priceCents,
  type PortalListing,
  type PortalMarketHit,
  type PortalResult,
} from "@/lib/vendor-portal";
import { saleReady, VENDOR_SALES_OPEN } from "@/lib/selling";
const LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function portalError(
  error: { message?: string; code?: string } | null,
  fallback: string,
): PortalResult {
  if (error?.code === "42501") return { error: "That stall is not yours." };
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
  const { data, error } = await supabase.rpc("my_vendor_portal");
  if (error) return { listing: null, error };
  return { listing: parseVendorPortal(data).find((row) => row.id === id) ?? null, error: null };
}

function revalidateListing(listing: PortalListing, extra: string[] = []) {
  revalidatePublishedDirectory([
    `/vendors/${listing.slug}`,
    "/vendor",
    `/vendor/${listing.id}`,
    "/products",
    ...listing.stalls.map((stall) => `/markets/${stall.market_slug}`),
    ...extra,
  ]);
}

async function requireOwned(id: string) {
  const { supabase, user } = await session();
  if (!supabase || !user) return { error: "Sign in first." as const, supabase: null, user: null };
  if (!isUuid(id)) return { error: "That stall is missing." as const, supabase: null, user: null };
  const { data, error } = await supabase.rpc("owns_vendor", { p_id: id });
  if (error || data !== true) {
    return { error: "That stall is not yours." as const, supabase: null, user: null };
  }
  return { error: null, supabase, user };
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export async function saveOwnedVendor(formData: FormData): Promise<PortalResult> {
  const id = text(formData, "vendor_id");
  const gate = await requireOwned(id);
  if (!gate.supabase) return { error: gate.error };
  const tags = formData
    .getAll("tags")
    .map((value) => String(value))
    .filter(Boolean);
  const { error } = await gate.supabase.rpc("save_owned_vendor", {
    p_id: id,
    p_name: text(formData, "name"),
    p_about: text(formData, "about"),
    p_website: text(formData, "website"),
    p_instagram: text(formData, "instagram"),
    p_tiktok: text(formData, "tiktok"),
    p_facebook: text(formData, "facebook"),
    p_phone: text(formData, "phone"),
    p_email: text(formData, "email"),
    p_tags: tags,
  });
  if (error) return portalError(error, "Could not save that stall.");
  const loaded = await loadOwned(gate.supabase, id);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: "Saved." };
}

export async function saveOwnedMenuItem(formData: FormData): Promise<PortalResult> {
  const vendorId = text(formData, "vendor_id");
  const gate = await requireOwned(vendorId);
  if (!gate.supabase) return { error: gate.error };
  const itemId = text(formData, "item_id").trim();
  const cents = priceCents(text(formData, "price"));
  if (cents === "bad") return { error: "That price is not allowed." };
  const forSale = VENDOR_SALES_OPEN && formData.get("for_sale") === "on";
  const offerDelivery = VENDOR_SALES_OPEN && formData.get("offer_delivery") === "on";
  const offerPickup = VENDOR_SALES_OPEN && formData.get("offer_pickup") === "on";
  const offerPreorder = VENDOR_SALES_OPEN && formData.get("offer_preorder") === "on";
  const terms = VENDOR_SALES_OPEN ? text(formData, "offer_terms") : "";
  if (VENDOR_SALES_OPEN && terms.trim().length > 4000) return { error: "Keep the terms shorter." };
  if (VENDOR_SALES_OPEN) {
    const saleError = saleReady({
      forSale,
      priceCents: cents,
      offers: { delivery: offerDelivery, pickup: offerPickup, preorder: offerPreorder },
    });
    if (saleError) return { error: saleError };
  }
  const dietary = text(formData, "dietary")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const { error } = await gate.supabase.rpc(
    "save_owned_menu_item",
    VENDOR_SALES_OPEN
      ? {
          p_vendor_id: vendorId,
          p_item_id: itemId && isUuid(itemId) ? itemId : null,
          p_name: text(formData, "name"),
          p_description: text(formData, "description"),
          p_price_cents: cents,
          p_season: text(formData, "season"),
          p_dietary: dietary,
          p_for_sale: forSale,
          p_offer_delivery: offerDelivery,
          p_offer_pickup: offerPickup,
          p_offer_preorder: offerPreorder,
          p_offer_terms: terms,
        }
      : {
          p_vendor_id: vendorId,
          p_item_id: itemId && isUuid(itemId) ? itemId : null,
          p_name: text(formData, "name"),
          p_description: text(formData, "description"),
          p_price_cents: cents,
          p_season: text(formData, "season"),
          p_dietary: dietary,
        },
  );
  if (error) return portalError(error, "Could not save that item.");
  const loaded = await loadOwned(gate.supabase, vendorId);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: itemId ? "Saved." : "Added." };
}

export async function deleteOwnedMenuItem(formData: FormData): Promise<PortalResult> {
  const vendorId = text(formData, "vendor_id");
  const itemId = text(formData, "item_id");
  const gate = await requireOwned(vendorId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(itemId)) return { error: "That item is missing." };
  const { error } = await gate.supabase.rpc("delete_owned_menu_item", {
    p_vendor_id: vendorId,
    p_item_id: itemId,
  });
  if (error) return portalError(error, "Could not remove that item.");
  const loaded = await loadOwned(gate.supabase, vendorId);
  if (loaded.listing) revalidateListing(loaded.listing);
  return { error: null, message: "Removed." };
}

export async function saveOwnedStall(formData: FormData): Promise<PortalResult> {
  const vendorId = text(formData, "vendor_id");
  const marketId = text(formData, "market_id");
  const gate = await requireOwned(vendorId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(marketId)) return { error: "That market is missing." };
  const days = formData
    .getAll("days")
    .map((value) => Number(value))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  if (days.length === 0) return { error: "Pick at least one day the market is open." };
  const { error } = await gate.supabase.rpc("save_owned_stall", {
    p_vendor_id: vendorId,
    p_market_id: marketId,
    p_stall: text(formData, "stall"),
    p_days: days,
  });
  if (error) return portalError(error, "Could not save that market.");
  const loaded = await loadOwned(gate.supabase, vendorId);
  const marketSlug = text(formData, "market_slug");
  if (loaded.listing) {
    revalidateListing(loaded.listing, marketSlug ? [`/markets/${marketSlug}`] : []);
  }
  return { error: null, message: "Saved." };
}

export async function deleteOwnedStall(formData: FormData): Promise<PortalResult> {
  const vendorId = text(formData, "vendor_id");
  const marketId = text(formData, "market_id");
  const gate = await requireOwned(vendorId);
  if (!gate.supabase) return { error: gate.error };
  if (!isUuid(marketId)) return { error: "That market is missing." };
  const before = await loadOwned(gate.supabase, vendorId);
  const { error } = await gate.supabase.rpc("delete_owned_stall", {
    p_vendor_id: vendorId,
    p_market_id: marketId,
  });
  if (error) return portalError(error, "Could not remove that market.");
  const loaded = await loadOwned(gate.supabase, vendorId);
  const previous = before.listing?.stalls.find((stall) => stall.market_id === marketId);
  if (loaded.listing) {
    revalidateListing(
      loaded.listing,
      previous ? [`/markets/${previous.market_slug}`] : [],
    );
  }
  return { error: null, message: "Removed." };
}

export async function uploadOwnedLogo(formData: FormData): Promise<PortalResult> {
  const id = text(formData, "vendor_id");
  const gate = await requireOwned(id);
  if (!gate.supabase || !gate.user) return { error: gate.error ?? "Sign in first." };
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > LOGO_BYTES) return { error: "Use an image under 5 MB." };
  const ext = LOGO_TYPES[file.type];
  if (!ext) return { error: "Use a JPEG, PNG, or WebP image." };

  const service = createServiceClient();
  if (!service) return { error: "Could not save that image." };
  const before = await loadOwned(gate.supabase, id);
  const objectName = `vendors/${id}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await service.storage.from("listing-marks").upload(objectName, bytes, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { error: "Could not save that image." };

  const { data: pub } = service.storage.from("listing-marks").getPublicUrl(objectName);
  const url = pub.publicUrl;
  if (ownedLogoObjectName(id, url) !== objectName) {
    await service.storage.from("listing-marks").remove([objectName]);
    return { error: "Could not save that image." };
  }

  const { data: updated, error } = await service
    .from("vendors")
    .update({ logo_url: url })
    .eq("id", id)
    .eq("claimed_by", gate.user.id)
    .select("id");
  if (error || !updated?.length) {
    await service.storage.from("listing-marks").remove([objectName]);
    return { error: "Could not save that image." };
  }

  const previous = before.listing?.logo_url;
  if (previous) {
    const previousName = ownedLogoObjectName(id, previous);
    if (previousName && previousName !== objectName) {
      await service.storage.from("listing-marks").remove([previousName]);
    }
  }
  if (before.listing) revalidateListing({ ...before.listing, logo_url: url });
  return { error: null, message: "Saved." };
}

export async function clearOwnedLogo(formData: FormData): Promise<PortalResult> {
  const id = text(formData, "vendor_id");
  const gate = await requireOwned(id);
  if (!gate.supabase || !gate.user) return { error: gate.error ?? "Sign in first." };
  const before = await loadOwned(gate.supabase, id);
  const service = createServiceClient();
  if (!service) return { error: "Could not remove that image." };
  const { data: updated, error } = await service
    .from("vendors")
    .update({ logo_url: null })
    .eq("id", id)
    .eq("claimed_by", gate.user.id)
    .select("id");
  if (error || !updated?.length) return { error: "Could not remove that image." };
  const previous = before.listing?.logo_url;
  if (previous) {
    const previousName = ownedLogoObjectName(id, previous);
    if (previousName) await service.storage.from("listing-marks").remove([previousName]);
  }
  if (before.listing) revalidateListing({ ...before.listing, logo_url: null });
  return { error: null, message: "Removed." };
}

export async function searchPortalMarkets(
  query: string,
): Promise<{ error: string | null; markets: PortalMarketHit[] }> {
  const { supabase, user } = await session();
  if (!supabase || !user) return { error: "Sign in first.", markets: [] };
  const { data: owns, error: ownsError } = await supabase.rpc("has_owned_vendor");
  if (ownsError || owns !== true) return { error: "That stall is not yours.", markets: [] };

  const q = query.trim().slice(0, 80);
  if (q.length < 2) return { error: null, markets: [] };
  const needle = q.replace(/[%_\\]/g, "");
  if (needle.length < 2) return { error: null, markets: [] };

  const service = createServiceClient();
  if (!service) return { error: "Could not search markets.", markets: [] };
  const { data, error } = await service
    .from("markets")
    .select("id, name, slug, city")
    .eq("status", "published")
    .ilike("name", `%${needle}%`)
    .order("name")
    .limit(12);
  if (error) return { error: "Could not search markets.", markets: [] };
  const rows = (data ?? []) as { id: string; name: string; slug: string; city: string }[];
  if (!rows.length) return { error: null, markets: [] };

  const { data: schedules, error: scheduleError } = await service
    .from("market_schedules")
    .select("market_id, weekday, opens_at, closes_at")
    .in(
      "market_id",
      rows.map((row) => row.id),
    );
  if (scheduleError) return { error: "Could not search markets.", markets: [] };

  const byMarket = new Map<string, { weekday: number; opens_at: string; closes_at: string }[]>();
  for (const row of schedules ?? []) {
    const list = byMarket.get(row.market_id) ?? [];
    list.push({
      weekday: row.weekday,
      opens_at: String(row.opens_at).slice(0, 5),
      closes_at: String(row.closes_at).slice(0, 5),
    });
    byMarket.set(row.market_id, list);
  }

  return {
    error: null,
    markets: rows.map((row) => {
      const hours = byMarket.get(row.id) ?? [];
      const openDays = [...new Set(hours.map((hour) => hour.weekday))].sort((a, b) => a - b);
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        city: row.city,
        openDays,
        hours,
      };
    }),
  };
}

export async function loadVendorPortal() {
  const { supabase, user } = await session();
  if (!supabase || !user) return { listings: [] as PortalListing[], signedIn: false };
  const { data, error } = await supabase.rpc("my_vendor_portal");
  if (error) return { listings: [] as PortalListing[], signedIn: true, error: true as const };
  return { listings: parseVendorPortal(data), signedIn: true, error: false as const };
}
