import { readOptOuts } from "@/lib/maintenance-sections";
import { listingLogoObjectName } from "@/lib/vendor-portal";

export const MARKET_ROSTER_CAP = 200;
export const MARKET_CREATED_CAP = 80;
export const MARKET_SCHEDULE_CAP = 24;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const SEASON = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH_LENGTHS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type MarketPortalSchedule = {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  season_start: string | null;
  season_end: string | null;
  notes: string | null;
};

export type MarketRosterStall = {
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  stall: string | null;
  days: number[];
  claimed: boolean;
  created_here: boolean;
  editable: boolean;
  about: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  tags: string[];
};

export type MarketPortalListing = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
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
  created_count: number;
  schedules: MarketPortalSchedule[];
  stalls: MarketRosterStall[];
};

export type PortalVendorHit = {
  id: string;
  name: string;
  slug: string;
};

export function marketLogoObjectName(marketId: string, url: string) {
  return listingLogoObjectName("markets", marketId, url);
}

export function createdStallLogoObjectName(vendorId: string, url: string) {
  return listingLogoObjectName("vendors", vendorId, url);
}

/** A real month-day. February 29 is allowed because the season repeats every year. */
export function seasonMonthDay(value: string) {
  if (!SEASON.test(value)) return false;
  const [month, day] = value.split("-").map(Number);
  const limit = MONTH_LENGTHS[month];
  return Boolean(limit) && day >= 1 && day <= limit;
}

/** Empty pair, both real month-days, or "bad" when only one side is set or a day cannot exist. */
export function portalSeason(start: string, end: string): { start: string; end: string } | "bad" {
  const seasonStart = start.trim();
  const seasonEnd = end.trim();
  if (!seasonStart && !seasonEnd) return { start: "", end: "" };
  if (!seasonMonthDay(seasonStart) || !seasonMonthDay(seasonEnd)) return "bad";
  return { start: seasonStart, end: seasonEnd };
}

/** What removing a stall did. `kept` means the public listing stays. */
export function rosterRemovalMessage(code: string | null) {
  if (code === "deleted") return "Removed. The listing is gone.";
  if (code === "kept:order") return "Removed from this market. The listing stays because it has an order.";
  if (code === "kept:market") {
    return "Removed from this market. The listing stays because it is still at another market.";
  }
  if (code === "kept:request") {
    return "Removed from this market. The listing stays because someone has asked to run it.";
  }
  return "Removed. Their listing stays.";
}

/** HH:MM with open before close, or "bad". */
export function portalHours(opens: string, closes: string): { opens: string; closes: string } | "bad" {
  const open = opens.trim();
  const close = closes.trim();
  if (!CLOCK.test(open) || !CLOCK.test(close) || open >= close) return "bad";
  return { opens: open, closes: close };
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

function clock(value: unknown) {
  return typeof value === "string" && CLOCK.test(value) ? value : null;
}

function parseSchedule(value: unknown): MarketPortalSchedule | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string") return null;
  const weekday = row.weekday;
  const opens = clock(row.opens_at);
  const closes = clock(row.closes_at);
  if (typeof weekday !== "number" || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  if (!opens || !closes) return null;
  return {
    id: row.id,
    weekday,
    opens_at: opens,
    closes_at: closes,
    season_start: textOrNull(row.season_start),
    season_end: textOrNull(row.season_end),
    notes: textOrNull(row.notes),
  };
}

function parseStall(value: unknown): MarketRosterStall | null {
  const row = asRecord(value);
  if (!row || typeof row.vendor_id !== "string" || typeof row.vendor_name !== "string") return null;
  if (typeof row.vendor_slug !== "string") return null;
  const editable = row.editable === true;
  return {
    vendor_id: row.vendor_id,
    vendor_name: row.vendor_name,
    vendor_slug: row.vendor_slug,
    stall: textOrNull(row.stall),
    days: weekdayList(row.days),
    claimed: row.claimed === true,
    created_here: row.created_here === true,
    editable,
    about: editable ? textOrNull(row.about) : null,
    website: editable ? textOrNull(row.website) : null,
    instagram: editable ? textOrNull(row.instagram) : null,
    tiktok: editable ? textOrNull(row.tiktok) : null,
    facebook: editable ? textOrNull(row.facebook) : null,
    phone: editable ? textOrNull(row.phone) : null,
    email: editable ? textOrNull(row.email) : null,
    logo_url: editable ? textOrNull(row.logo_url) : null,
    tags: editable ? textList(row.tags) : [],
  };
}

function parseListing(value: unknown): MarketPortalListing | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.slug !== "string" || typeof row.name !== "string") {
    return null;
  }
  if (typeof row.address !== "string" || typeof row.city !== "string" || typeof row.province !== "string") {
    return null;
  }
  const created = row.created_count;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    about: textOrNull(row.about),
    address: row.address,
    city: row.city,
    province: row.province,
    postal_code: textOrNull(row.postal_code),
    website: textOrNull(row.website),
    instagram: textOrNull(row.instagram),
    tiktok: textOrNull(row.tiktok),
    facebook: textOrNull(row.facebook),
    phone: textOrNull(row.phone),
    email: textOrNull(row.email),
    logo_url: textOrNull(row.logo_url),
    tags: textList(row.tags),
    maintenance_opt_outs: readOptOuts("market", row.maintenance_opt_outs),
    status: row.status === "draft" ? "draft" : "published",
    created_count: typeof created === "number" && Number.isInteger(created) && created > 0 ? created : 0,
    schedules: Array.isArray(row.schedules)
      ? row.schedules.flatMap((item) => {
          const schedule = parseSchedule(item);
          return schedule ? [schedule] : [];
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

export function parseMarketPortal(data: unknown): MarketPortalListing[] {
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

export function openDaysFromSchedules(schedules: MarketPortalSchedule[]) {
  return [...new Set(schedules.map((row) => row.weekday))].sort((a, b) => a - b);
}
