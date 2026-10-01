import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatHours,
  formatSeasonRange,
  nextOpenDateLabel,
  nextOpenLabel,
  nextOpenSlot,
  onlyWeekdayLabel,
  type ScheduleRow,
} from "../src/lib/schedule.ts";

function loadEnv(path: string) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(join(import.meta.dirname, "..", ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing service role Supabase env");

type Market = { id: string; slug: string; name: string; province: string; status: string };
type Schedule = ScheduleRow & { market_id: string; season_start: string | null; season_end: string | null };
type Stall = { market_id: string; vendor_id: string; days: number[] };
type Vendor = { id: string; slug: string; status: string };

async function page<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey: key!,
        authorization: `Bearer ${key}`,
        range: `${from}-${from + 999}`,
      },
    });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    const chunk = (await response.json()) as T[];
    rows.push(...chunk);
    if (chunk.length < 1000) return rows;
  }
}

async function main() {
const [markets, schedules, vendors, stalls] = await Promise.all([
  page<Market>("published_markets?select=id,slug,name,province,status"),
  page<Schedule>(
    "published_schedules?select=market_id,weekday,opens_at,closes_at,season_start,season_end",
  ),
  page<Vendor>("published_vendors?select=id,slug,status"),
  page<Stall>("published_stalls?select=market_id,vendor_id,days"),
]);

const byMarket = new Map<string, Schedule[]>();
for (const row of schedules) {
  const list = byMarket.get(row.market_id) ?? [];
  list.push(row);
  byMarket.set(row.market_id, list);
}

const wednesdayEvening = new Date("2026-09-30T20:00:00-04:00");
const problems: string[] = [];

function cardLine(rows: Schedule[], province: string, now: Date) {
  const slot = nextOpenSlot(rows, province, now);
  if (!slot) return "See schedule";
  const hours = formatHours(slot.opensAt, slot.closesAt);
  const date = nextOpenDateLabel(province, now, slot);
  if (date) return `${hours} ${date}`;
  if (slot.waitMinutes === 0) return `Open now ${hours}`;
  const only = onlyWeekdayLabel(rows);
  const when = nextOpenLabel(rows, province, now);
  const dayName = only?.replace(/ only$/, "") ?? "";
  if (only && when.startsWith(`${dayName} `)) return `${hours} ${only}`;
  return when;
}

for (const market of markets) {
  const rows = byMarket.get(market.id) ?? [];
  if (!rows.length) {
    problems.push(`${market.slug}: no schedule`);
    continue;
  }
  const slot = nextOpenSlot(rows, market.province || "ON", wednesdayEvening);
  if (!slot) continue;
  const hours = formatHours(slot.opensAt, slot.closesAt);
  const line = cardLine(rows, market.province || "ON", wednesdayEvening);
  const label = nextOpenLabel(rows, market.province || "ON", wednesdayEvening);
  if (slot.offset >= 7 && (!line.includes(hours) || !label.includes(hours))) {
    problems.push(`${market.slug}: "${line}" / "${label}" missing ${hours}`);
  }
  for (const row of rows) {
    const season = formatSeasonRange(row.season_start, row.season_end);
    const oneSided = Boolean(row.season_start) !== Boolean(row.season_end);
    if (oneSided && season === "Year-round") {
      problems.push(`${market.slug}: one-sided season still says Year-round`);
    }
  }
}

const lions = markets.find((market) => market.slug === "lions-farmers-market-celebration-square");
const shipp = markets.find((market) => market.slug === "lions-farmers-market-shipp-drive");
if (!lions || !shipp) throw new Error("Lions markets missing");
const lionsLine = cardLine(byMarket.get(lions.id) ?? [], lions.province || "ON", wednesdayEvening);
const shippLine = cardLine(byMarket.get(shipp.id) ?? [], shipp.province || "ON", wednesdayEvening);
if (lionsLine !== "8 AM–3 PM Oct 7") problems.push(`celebration card: ${lionsLine}`);
if (shippLine !== "8 AM–3 PM Sunday only") problems.push(`shipp card: ${shippLine}`);

const marketIds = new Set(markets.map((market) => market.id));
const vendorIds = new Set(vendors.map((vendor) => vendor.id));
const weekdays = new Map<string, Set<number>>();
for (const row of schedules) {
  const set = weekdays.get(row.market_id) ?? new Set();
  set.add(Number(row.weekday));
  weekdays.set(row.market_id, set);
}
const halls = new Map<string, Set<string>>();
for (const stall of stalls) {
  if (!marketIds.has(stall.market_id) || !vendorIds.has(stall.vendor_id)) continue;
  const open = weekdays.get(stall.market_id);
  for (const day of stall.days ?? []) {
    if (open && !open.has(Number(day))) {
      problems.push(`stall ${stall.vendor_id} at ${stall.market_id} day ${day} is not on the schedule`);
    }
  }
  const set = halls.get(stall.vendor_id) ?? new Set();
  set.add(stall.market_id);
  halls.set(stall.vendor_id, set);
}

if (problems.length) {
  console.error(problems.slice(0, 40).join("\n"));
  throw new Error(`${problems.length} listing mismatches`);
}

console.log(
  `listing lines ok: ${markets.length} markets, ${vendors.length} vendors, ${stalls.length} stalls`,
);
console.log("celebration", lionsLine);
console.log("shipp", shippLine);
}

main();
