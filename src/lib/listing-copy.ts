import { WEEKDAYS } from "@/lib/constants";
import { formatHours } from "@/lib/schedule";
import type { MarketSchedule } from "@/types/database";

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

export function vendorPageTitle(name: string, marketNames: string[]) {
  const at = joinList(marketNames.slice(0, 3));
  return at ? `${name} at ${at}` : name;
}

export function vendorPageDescription({
  name,
  about,
  marketNames,
}: {
  name: string;
  about: string | null;
  marketNames: string[];
}) {
  if (about?.trim()) return clipMeta(about);
  const at = joinList(marketNames);
  return at
    ? `${name} at ${at} in Toronto.`
    : `${name} at Toronto farmers' markets.`;
}

export function marketPageTitle(name: string, city: string) {
  return `${name} in ${city}`;
}

export function marketPageDescription({
  name,
  about,
  city,
  province,
  schedules,
}: {
  name: string;
  about: string | null;
  city: string;
  province: string;
  schedules: MarketSchedule[];
}) {
  if (about?.trim()) return clipMeta(about);
  const hours = hoursLine(schedules);
  return hours
    ? clipMeta(`${name} in ${city}, ${province}. ${hours}.`)
    : `${name} in ${city}, ${province}.`;
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
