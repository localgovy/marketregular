import { LAUNCH_TZ } from "@/lib/launch";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function formatPrice(cents: number | null) {
  if (cents == null) return null;
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const body =
    remainder === 0 ? `$${dollars}` : `$${dollars}.${String(remainder).padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function formatPriceLevel(level: number | null | undefined) {
  if (!level || level < 1 || level > 3) return null;
  return "$".repeat(level);
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function externalHref(href: string | null | undefined) {
  const value = href?.trim();
  if (!value) return null;
  const collapsed = value.replace(/([^:])\/{2,}/g, "$1/");
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(collapsed)
    ? collapsed
    : `https://${collapsed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

const SVG_SRC = /\.svg(\?|$)/i;
const STORAGE_PUBLIC = "/storage/v1/object/public/";
const STORAGE_RENDER = "/storage/v1/render/image/public/";

/** Card lockup is 4.5rem × 3rem; 180px is 3× at 16px root. */
export const LISTING_MARK_WIDTH = 180;

/** Original public URL, or null for missing/SVG (drawn fallback). */
export function listingMarkOriginal(src: string | null | undefined) {
  const url = externalHref(src);
  if (!url || SVG_SRC.test(url)) return null;
  return url;
}

/**
 * Supabase Storage transform for directory cards. Other hosts and failed
 * rewrites keep the original so a mark never disappears.
 */
export function listingMarkSrc(
  src: string | null | undefined,
  width = LISTING_MARK_WIDTH,
) {
  const url = listingMarkOriginal(src);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.includes(STORAGE_PUBLIC)) return url;
    parsed.pathname = parsed.pathname.replace(STORAGE_PUBLIC, STORAGE_RENDER);
    parsed.searchParams.set("width", String(width));
    parsed.searchParams.set("resize", "contain");
    parsed.searchParams.set("quality", "70");
    return parsed.href;
  } catch {
    return url;
  }
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Calendar date in `tz`. Numeric parts only — no locale month names. */
export function formatPostedAt(iso: string, tz = LAUNCH_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);
  if (month < 1 || month > 12 || !day) return iso;
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

export function timeAgo(iso: string, now = Date.now()) {
  const delta = now - new Date(iso).getTime();
  const min = Math.round(delta / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatPostedAt(iso);
}
