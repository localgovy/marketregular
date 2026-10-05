import { externalHref, socialProfileHref } from "@/lib/format";
import { readOptOuts } from "@/lib/maintenance-sections";
import { formatHours, formatSeasonRange } from "@/lib/schedule";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PORTAL_TAG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Same cap as portal_tags(..., 24) in save_owned_vendor. */
export const PORTAL_TAG_CAP = 24;

const PORTAL_LINK_LENGTH = 2048;

export type PortalHours = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  season_start?: string | null;
  season_end?: string | null;
  notes?: string | null;
};

export type PortalMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  season: string | null;
  dietary: string[];
  for_sale: boolean;
  offer_delivery: boolean;
  offer_pickup: boolean;
  offer_preorder: boolean;
  offer_terms: string | null;
};

export type PortalOrder = {
  id: string;
  item_name: string;
  quantity: number;
  charge_cents: number;
  fulfillment: string;
  status: string;
  fulfillment_note: string | null;
  delivery_name: string | null;
  delivery_line1: string | null;
  delivery_city: string | null;
  delivery_region: string | null;
  delivery_postal: string | null;
  buyer_email: string | null;
  paid_at: string | null;
};

export type PortalStall = {
  market_id: string;
  market_name: string;
  market_slug: string;
  market_city: string;
  stall: string | null;
  days: number[];
  open_days: number[];
  hours: PortalHours[];
};

export type PortalListing = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  tags: string[];
  maintenance_opt_outs: string[];
  status: "draft" | "published";
  selling_approved: boolean;
  card_payments_active: boolean;
  payouts_active: boolean;
  payments_started: boolean;
  fee_balance_cents: number;
  fee_due_on: string | null;
  menus: PortalMenuItem[];
  orders: PortalOrder[];
  stalls: PortalStall[];
};

export type PortalMarketHit = {
  id: string;
  name: string;
  slug: string;
  city: string;
  openDays: number[];
  hours: PortalHours[];
};

export type PortalResult = { error: string | null; message?: string };

export function isUuid(value: string) {
  return UUID.test(value);
}

export function normalizePortalTag(raw: string) {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (!cleaned || cleaned.length > 40 || !PORTAL_TAG.test(cleaned)) return null;
  return cleaned;
}

/** Public http(s) link, null when the field is empty, or "bad" when it would not show. */
export function portalSocialHref(
  kind: "instagram" | "tiktok" | "facebook",
  raw: string,
): string | null | "bad" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const href = socialProfileHref(kind, trimmed);
  if (!href) return "bad";
  const checked = portalListingHref(href);
  if (checked === "bad" || !checked) return "bad";
  return checked;
}

export function portalListingHref(raw: string): string | null | "bad" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const href = externalHref(trimmed);
  if (!href || href.length > PORTAL_LINK_LENGTH) return "bad";
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "bad";
  }
  if (!url.hostname.includes(".")) return "bad";
  return href;
}

export function priceCents(raw: string): number | null | "bad" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return "bad";
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isInteger(cents) || cents < 0 || cents > 1_000_000) return "bad";
  return cents;
}

export function dollarsFromCents(cents: number | null) {
  if (cents == null) return "";
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return remainder === 0 ? String(dollars) : `${dollars}.${String(remainder).padStart(2, "0")}`;
}

/** File bytes, not the browser's content type. */
export function imageKind(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

/** Object name inside listing-marks, or null when the URL is not this listing's upload. */
export function listingLogoObjectName(folder: "vendors" | "markets", id: string, url: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base || !isUuid(id)) return null;
  const prefix = `${base}/storage/v1/object/public/listing-marks/${folder}/${id}/`;
  if (!url.startsWith(prefix)) return null;
  const file = url.slice(prefix.length).split("?")[0] ?? "";
  if (!file || !/^[A-Za-z0-9._-]+$/.test(file) || file.includes("..")) return null;
  return `${folder}/${id}/${file}`;
}

/** Object name inside listing-marks, or null when the URL is not this stall's upload. */
export function ownedLogoObjectName(vendorId: string, url: string) {
  return listingLogoObjectName("vendors", vendorId, url);
}

function sessionLabel(row: PortalHours) {
  const clock = formatHours(row.opens_at, row.closes_at);
  const season =
    row.season_start && row.season_end ? formatSeasonRange(row.season_start, row.season_end) : null;
  const notes = row.notes?.trim() ? row.notes.trim() : null;
  return [clock, season, notes].filter(Boolean).join(", ");
}

export function dayHoursLabel(hours: PortalHours[], weekday: number) {
  const labels = [
    ...new Set(hours.filter((row) => row.weekday === weekday).map((row) => sessionLabel(row))),
  ];
  return labels.join("; ");
}

/** The public stall page exists when it is published and has a hall, or it is on the unaffiliated list. */
export function vendorPublicPageExists(status: string, stallCount: number, unaffiliated: boolean) {
  return status === "published" && (stallCount > 0 || unaffiliated);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function textList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function weekdayList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const days = value.filter(
    (item): item is number => typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 6,
  );
  return [...new Set(days)].sort((a, b) => a - b);
}

function hoursList(value: unknown): PortalHours[] {
  if (!Array.isArray(value)) return [];
  const rows: PortalHours[] = [];
  for (const item of value) {
    const row = asRecord(item);
    if (!row) continue;
    const weekday = row.weekday;
    const opens = row.opens_at;
    const closes = row.closes_at;
    if (
      typeof weekday !== "number" ||
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6 ||
      typeof opens !== "string" ||
      typeof closes !== "string"
    ) {
      continue;
    }
    rows.push({
      weekday,
      opens_at: opens,
      closes_at: closes,
      season_start: textOrNull(row.season_start),
      season_end: textOrNull(row.season_end),
      notes: textOrNull(row.notes),
    });
  }
  return rows;
}

function flag(value: unknown) {
  return value === true;
}

function parseMenu(value: unknown): PortalMenuItem | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.name !== "string") return null;
  const price = row.price_cents;
  return {
    id: row.id,
    name: row.name,
    description: textOrNull(row.description),
    price_cents: typeof price === "number" && Number.isInteger(price) ? price : null,
    season: textOrNull(row.season),
    dietary: textList(row.dietary),
    for_sale: flag(row.for_sale),
    offer_delivery: flag(row.offer_delivery),
    offer_pickup: flag(row.offer_pickup),
    offer_preorder: flag(row.offer_preorder),
    offer_terms: textOrNull(row.offer_terms),
  };
}

function parseOrder(value: unknown): PortalOrder | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.item_name !== "string") return null;
  const quantity = row.quantity;
  const charge = row.charge_cents;
  if (typeof quantity !== "number" || typeof charge !== "number") return null;
  return {
    id: row.id,
    item_name: row.item_name,
    quantity,
    charge_cents: charge,
    fulfillment: typeof row.fulfillment === "string" ? row.fulfillment : "",
    status: typeof row.status === "string" ? row.status : "",
    fulfillment_note: textOrNull(row.fulfillment_note),
    delivery_name: textOrNull(row.delivery_name),
    delivery_line1: textOrNull(row.delivery_line1),
    delivery_city: textOrNull(row.delivery_city),
    delivery_region: textOrNull(row.delivery_region),
    delivery_postal: textOrNull(row.delivery_postal),
    buyer_email: textOrNull(row.buyer_email),
    paid_at: textOrNull(row.paid_at),
  };
}

function parseStall(value: unknown): PortalStall | null {
  const row = asRecord(value);
  if (!row || typeof row.market_id !== "string" || typeof row.market_name !== "string") return null;
  if (typeof row.market_slug !== "string") return null;
  return {
    market_id: row.market_id,
    market_name: row.market_name,
    market_slug: row.market_slug,
    market_city: typeof row.market_city === "string" ? row.market_city : "",
    stall: textOrNull(row.stall),
    days: weekdayList(row.days),
    open_days: weekdayList(row.open_days),
    hours: hoursList(row.hours),
  };
}

function parseListing(value: unknown): PortalListing | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.name !== "string") {
    return null;
  }
  const status = row.status === "draft" ? "draft" : "published";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    about: textOrNull(row.about),
    website: textOrNull(row.website),
    instagram: textOrNull(row.instagram),
    tiktok: textOrNull(row.tiktok),
    facebook: textOrNull(row.facebook),
    phone: textOrNull(row.phone),
    email: textOrNull(row.email),
    logo_url: textOrNull(row.logo_url),
    tags: textList(row.tags),
    maintenance_opt_outs: readOptOuts("vendor", row.maintenance_opt_outs),
    status,
    selling_approved: flag(row.selling_approved),
    card_payments_active: flag(row.card_payments_active),
    payouts_active: flag(row.payouts_active),
    payments_started: flag(row.payments_started),
    fee_balance_cents:
      typeof row.fee_balance_cents === "number" && Number.isInteger(row.fee_balance_cents)
        ? row.fee_balance_cents
        : 0,
    fee_due_on: textOrNull(row.fee_due_on),
    menus: Array.isArray(row.menus)
      ? row.menus.flatMap((item) => {
          const menu = parseMenu(item);
          return menu ? [menu] : [];
        })
      : [],
    orders: Array.isArray(row.orders)
      ? row.orders.flatMap((item) => {
          const order = parseOrder(item);
          return order ? [order] : [];
        })
      : [],
    stalls: Array.isArray(row.stalls)
      ? row.stalls.flatMap((item) => {
          const stall = parseStall(item);
          return stall ? [stall] : [];
        })
      : [],
  };
}

export function parseVendorPortal(data: unknown): PortalListing[] {
  let raw = data;
  if (typeof data === "string") {
    try {
      raw = JSON.parse(data) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    const listing = parseListing(row);
    return listing ? [listing] : [];
  });
}
