import { PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { tagLabel } from "@/lib/tag-label";
import { formatHours } from "@/lib/schedule";
import type { MarketSchedule } from "@/types/database";

/** Google truncates near 60. The distinguishing words have to land before that. */
const TITLE_BUDGET = 58;

const PRODUCT_SET = new Set<string>(PRODUCT_TAGS);

export function joinList(items: string[]) {
  const unique = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
}

export function clipMeta(text: string, max = 160) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  const slice = compact.slice(0, max - 1);
  const at = slice.lastIndexOf(" ");
  return `${(at > 80 ? slice.slice(0, at) : slice).trimEnd()}…`;
}

/** Whole first sentence when it fits, otherwise a clean clip — never an empty tail. */
function snippetTail(text: string, max = 120) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact || max < 40) return "";
  const stop = compact.search(/[.!?](\s|$)/);
  const sentence = stop > 0 ? compact.slice(0, stop + 1) : compact;
  return sentence.length <= max ? sentence : clipMeta(compact, max);
}

function plural(day: string) {
  return `${day}s`;
}

function consecutive(days: number[]) {
  return days.every((day, index) => index === 0 || day === (days[index - 1] ?? -9) + 1);
}

function dayGroupLabel(days: number[]) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const names: string[] = sorted.flatMap((day) => {
    const name = WEEKDAYS[day];
    return name ? [name] : [];
  });
  if (!names.length) return "";
  if (names.length === 1) return plural(names[0]!);
  if (names.length > 2 && consecutive(sorted)) {
    return `${names[0]} to ${names[names.length - 1]}`;
  }
  return joinList(names.map(plural));
}

/**
 * “Saturdays 8 AM–1 PM · Sundays 9 AM–2 PM”. Days that share hours collapse into one
 * group. Season notes are deliberately excluded — those are research copy, not a snippet.
 */
export function scheduleDaysLine(schedules: MarketSchedule[], maxGroups = 3) {
  const byHours = new Map<string, number[]>();
  for (const row of schedules) {
    const hours = formatHours(row.opens_at, row.closes_at);
    const days = byHours.get(hours) ?? [];
    if (!days.includes(Number(row.weekday))) days.push(Number(row.weekday));
    byHours.set(hours, days);
  }
  const groups = [...byHours.entries()]
    .map(([hours, days]) => ({ hours, days, first: Math.min(...days) }))
    .sort((a, b) => a.first - b.first);
  const shown = groups
    .slice(0, maxGroups)
    .map((group) => `${dayGroupLabel(group.days)} ${group.hours}`)
    .filter(Boolean);
  if (!shown.length) return "";
  const line = shown.join(" · ");
  return groups.length > shown.length ? `${line} · and more` : line;
}

/** Number of distinct day-and-hours groups, so callers can pick a sentence shape. */
function scheduleGroupCount(schedules: MarketSchedule[]) {
  return new Set(schedules.map((row) => formatHours(row.opens_at, row.closes_at))).size;
}

/**
 * “produce, bakery and prepared food”. Only what a shopper can buy — `indoor`,
 * `seasonal` and the rest of the amenity tags are not answers to “what do they sell”.
 */
export function sellsLine(tags: string[], limit = 3) {
  const labels = tags
    .filter((tag) => PRODUCT_SET.has(tag))
    .slice(0, limit)
    .map((tag) => tagLabel(tag).toLowerCase());
  return joinList(labels);
}

export function vendorPageTitle(name: string, marketNames: string[]) {
  const halls = marketNames.filter((market) => market.trim());
  const first = halls[0];
  if (!first) return `${name} — ${LAUNCH_CITY} farmers' markets`;
  const at = `${name} at ${first}`;
  if (halls.length === 1 || at.length <= TITLE_BUDGET) return at;
  return `${name} — ${halls.length} ${LAUNCH_CITY} farmers' markets`;
}

/**
 * Where and when first: someone searching a stall by name wants to know which market to
 * go to. The shop's own words are the tail, not the whole snippet.
 */
export function vendorPageDescription({
  name,
  about,
  marketNames,
  days = [],
  tags = [],
}: {
  name: string;
  about: string | null;
  marketNames: string[];
  days?: number[];
  tags?: string[];
}) {
  const halls = marketNames.filter((market) => market.trim());
  const sells = sellsLine(tags, 2);
  const head = sells ? `${name} sells ${sells}` : name;

  const parts: string[] = [];
  if (halls.length === 1) {
    // One hall, so its days are specific enough to be worth the characters.
    const when = dayGroupLabel(days);
    parts.push(`${head} at ${halls[0]}${when ? `, ${when}` : ""}.`);
  } else if (halls.length > 1) {
    const more = halls.length - 1;
    parts.push(
      `${head} at ${halls[0]} and ${more} more ${LAUNCH_CITY} farmers' ${more === 1 ? "market" : "markets"}.`,
    );
  } else {
    parts.push(`${head} at ${LAUNCH_REGION} farmers' markets.`);
  }

  const tail = about?.trim() ? snippetTail(about, 158 - parts.join(" ").length) : "";
  if (tail) parts.push(tail);
  return clipMeta(parts.join(" "));
}

export function marketPlaceLine(address: string | null | undefined, city: string) {
  const street = address?.trim() ?? "";
  const town = city.trim();
  if (!street) return town;
  if (!town) return street;
  if (street.toLowerCase().includes(town.toLowerCase())) return street;
  return `${street} · ${town}`;
}

export function marketListName(name: string, city: string) {
  const town = city.trim();
  if (!town || town.toLowerCase() === LAUNCH_CITY.toLowerCase()) return name;
  if (name.toLowerCase().includes(town.toLowerCase())) return name;
  return `${name} · ${town}`;
}

/**
 * A qualifier wins over the city: for two floors of one market, "which floor" is the
 * thing that has to be visible in the SERP, and the city is already in the description.
 */
export function marketPageTitle(name: string, city: string, qualifier?: string | null) {
  if (qualifier) {
    const tagged = `${name} — ${qualifier}`;
    if (tagged.length <= TITLE_BUDGET) return tagged;
  }
  const withCity = `${name} in ${city}`;
  if (withCity.length <= TITLE_BUDGET) return withCity;
  return name;
}

/**
 * Hours, address, then size. A “x farmers market” search is asking when it is open and
 * where it is; the `about` text answered neither, which is why these ranked without clicks.
 */
export function marketPageDescription({
  name,
  about,
  city,
  province,
  schedules,
  address,
  tags = [],
  stallCount = 0,
}: {
  name: string;
  about: string | null;
  city: string;
  province: string;
  schedules: MarketSchedule[];
  address?: string | null;
  tags?: string[];
  stallCount?: number;
}) {
  const when = scheduleDaysLine(schedules);
  const street = address?.trim();
  const where = street ? `${street}, ${city}` : `${city}, ${province}`;

  const parts: string[] = [];
  if (!when) {
    parts.push(`${name} in ${where}.`);
  } else if (scheduleGroupCount(schedules) > 1) {
    // “Sundays 10 AM–5 PM · Tuesday to Friday 9 AM–7 PM at 91 Front St” reads broken.
    parts.push(`${where}. Open ${when}.`);
  } else {
    parts.push(`${when} at ${where}.`);
  }

  const sells = sellsLine(tags);
  if (stallCount > 0) {
    parts.push(
      `${stallCount} ${stallCount === 1 ? "stall" : "stalls"}${sells ? `: ${sells}` : ""}.`,
    );
  } else if (sells) {
    parts.push(`${sells}.`);
  }

  const room = 158 - parts.join(" ").length;
  const tail = about?.trim() ? snippetTail(about, room) : "";
  if (tail) parts.push(tail);

  return clipMeta(parts.join(" "));
}

/** Meta descriptions only. Do not render as page copy — the Hours list is the schedule. */
export function hoursLine(schedules: MarketSchedule[]) {
  return schedules
    .map((row) => {
      const day = WEEKDAYS[row.weekday] ?? "Day";
      const hours = formatHours(row.opens_at, row.closes_at);
      const note = row.notes?.replace(/\.$/, "").trim();
      const place = note && note.length < 72 ? note : null;
      return place ? `${day}s ${hours}, ${place}` : `${day}s ${hours}`;
    })
    .join(" · ");
}
