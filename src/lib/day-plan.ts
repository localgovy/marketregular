import { torontoIsoOffset, torontoNoon, torontoYmd } from "@/lib/events-month";
import { provinceTz } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import {
  formatHours,
  formatTime,
  inSeason,
  nextOpenSlot,
  zonedParts,
  type ScheduleRow,
} from "@/lib/schedule";

export const DAY_PLAN_KEY = "mr-day-plan";

export type TravelMode = "walk" | "transit" | "drive";

export type DayPlanHall = {
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  date: string;
};

export type DayPlan = {
  hall: DayPlanHall;
  vendorSlugs: string[];
  mode: TravelMode;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MODES: TravelMode[] = ["walk", "transit", "drive"];

export function validPlanSlug(value: string) {
  return value.length >= 1 && value.length <= 160 && SLUG.test(value);
}

function finiteCoord(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function parseDayPlan(value: unknown): DayPlan | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const hall = raw.hall;
  if (!hall || typeof hall !== "object") return null;
  const h = hall as Record<string, unknown>;
  if (typeof h.slug !== "string" || !validPlanSlug(h.slug)) return null;
  if (typeof h.name !== "string" || !h.name.trim()) return null;
  if (typeof h.address !== "string") return null;
  if (!finiteCoord(h.lat, -90, 90) || !finiteCoord(h.lng, -180, 180)) return null;
  if (typeof h.hours !== "string") return null;
  if (typeof h.date !== "string" || !ISO.test(h.date)) return null;
  const mode = raw.mode;
  if (mode !== "walk" && mode !== "transit" && mode !== "drive") return null;
  const vendors = Array.isArray(raw.vendorSlugs)
    ? [...new Set(raw.vendorSlugs.filter((slug): slug is string => typeof slug === "string" && validPlanSlug(slug)))]
    : [];
  return {
    hall: {
      slug: h.slug,
      name: h.name.trim(),
      address: h.address,
      lat: h.lat as number,
      lng: h.lng as number,
      hours: h.hours,
      date: h.date,
    },
    vendorSlugs: vendors.slice(0, 80),
    mode,
  };
}

export const DAY_PLAN_EVENT = "mr-day-plan";

export function mergeHall(current: DayPlanHall, next: DayPlanHall): DayPlanHall {
  return {
    ...current,
    ...next,
    hours: next.hours.trim() ? next.hours : current.hours,
  };
}

export function writeDayPlan(plan: DayPlan | null) {
  if (typeof window === "undefined") return;
  try {
    if (!plan) {
      window.localStorage.removeItem(DAY_PLAN_KEY);
    } else {
      window.localStorage.setItem(DAY_PLAN_KEY, JSON.stringify(plan));
    }
    window.dispatchEvent(new Event(DAY_PLAN_EVENT));
  } catch {
    // private mode
  }
}

export function subscribeDayPlan(onStoreChange: () => void) {
  window.addEventListener(DAY_PLAN_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(DAY_PLAN_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function dayPlanSnapshot() {
  try {
    return window.localStorage.getItem(DAY_PLAN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function dayPlanServerSnapshot() {
  return "";
}

export function formatSlipDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function weekdayFromIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return 0;
  return zonedParts(torontoNoon(year, month, day), LAUNCH_TZ).weekday;
}

export function isSlipDateInRange(iso: string, now = new Date()) {
  if (!ISO.test(iso)) return false;
  const min = torontoIsoOffset(now, -1);
  const max = torontoIsoOffset(now, 400);
  return iso >= min && iso <= max;
}

export function nextIsoForWeekdays(days: number[], now = new Date()) {
  if (!days.length) return torontoYmd(now);
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  for (let offset = 0; offset < 7; offset += 1) {
    if (days.includes((today + offset) % 7)) return torontoIsoOffset(now, offset);
  }
  return torontoYmd(now);
}

export function hoursOnIso(schedules: ScheduleRow[], province: string, iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  const when = torontoNoon(year, month, day);
  const tz = provinceTz(province);
  const { weekday } = zonedParts(when, tz);
  const row = schedules.find(
    (item) =>
      item.weekday === weekday && inSeason(when, item.season_start, item.season_end, tz),
  );
  return row ? formatHours(row.opens_at, row.closes_at) : "";
}

export function slipDateAndHours(schedules: ScheduleRow[], province: string, now = new Date()) {
  const tz = provinceTz(province);
  const slot = nextOpenSlot(schedules, province, now);
  if (!slot) {
    return { date: torontoYmd(now), hours: "" };
  }
  const date = torontoIsoOffset(now, slot.offset, tz);
  const hours = hoursOnIso(schedules, province, date);
  return {
    date,
    hours: hours || formatTime(slot.opensAt),
  };
}

export function hallFromMarket(
  market: {
    slug: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    province: string;
  },
  schedules: ScheduleRow[],
  date?: string,
): DayPlanHall {
  const next = date
    ? { date, hours: hoursOnIso(schedules, market.province, date) }
    : slipDateAndHours(schedules, market.province);
  return {
    slug: market.slug,
    name: market.name,
    address: market.address,
    lat: market.lat,
    lng: market.lng,
    hours: next.hours,
    date: next.date,
  };
}

const SPEED_KPH: Record<TravelMode, number> = {
  walk: 5,
  transit: 18,
  drive: 28,
};

export function formatAboutTime(meters: number, mode: TravelMode) {
  const km = Math.max(0, meters) / 1000;
  const minutes = Math.max(1, Math.round((km / SPEED_KPH[mode]) * 60));
  if (minutes < 60) return `about ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return hours === 1 ? "about 1 hr" : `about ${hours} hr`;
  return `about ${hours} hr ${rest} min`;
}

export function isAppleMapsDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function mapsUrl(lat: number, lng: number, mode: TravelMode, apple = false) {
  const dest = `${lat},${lng}`;
  if (apple) {
    const dirflg = mode === "walk" ? "w" : mode === "transit" ? "r" : "d";
    return `https://maps.apple.com/?daddr=${dest}&dirflg=${dirflg}`;
  }
  const travelmode = mode === "walk" ? "walking" : mode === "transit" ? "transit" : "driving";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=${travelmode}`;
}

export const TRAVEL_MODES: { id: TravelMode; label: string }[] = MODES.map((id) => ({
  id,
  label: id === "walk" ? "Walk" : id === "transit" ? "Transit" : "Drive",
}));
