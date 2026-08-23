import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  seedMarketVendors,
  seedMarkets,
  seedVendors,
} from "../src/data/directory.ts";
import { isLaunchCity } from "../src/lib/launch.ts";

const launchMarkets = seedMarkets.filter((m) => isLaunchCity(m.city));
const launchIds = new Set(launchMarkets.map((m) => m.id));
const launchLinks = seedMarketVendors.filter((mv) => launchIds.has(mv.market_id));
const launchVendorIds = new Set(launchLinks.map((mv) => mv.vendor_id));
const launchVendors = seedVendors.filter((v) => launchVendorIds.has(v.id));

function sqlStr(value: string | null | undefined) {
  if (value == null) return "null";
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlArr(values: string[] | number[]) {
  if (values.length === 0) return `'{}'`;
  if (typeof values[0] === "number") {
    return `ARRAY[${values.join(", ")}]::smallint[]`;
  }
  return `ARRAY[${values.map((v) => sqlStr(String(v))).join(", ")}]`;
}

const lines: string[] = [
  "-- Generated from Toronto launch markets in src/data/directory.ts — re-run scripts/generate-seed-sql.ts after seed edits",
  "insert into public.markets (id, slug, name, about, address, city, province, postal_code, lat, lng, geofence_radius_m, website, phone, email, tags, status, featured) values",
];

lines.push(
  launchMarkets
    .map(
      (m) =>
        `  (${sqlStr(m.id)}, ${sqlStr(m.slug)}, ${sqlStr(m.name)}, ${sqlStr(m.about)}, ${sqlStr(m.address)}, ${sqlStr(m.city)}, ${sqlStr(m.province)}, ${sqlStr(m.postal_code)}, ${m.lat}, ${m.lng}, ${m.geofence_radius_m}, ${sqlStr(m.website)}, ${sqlStr(m.phone)}, ${sqlStr(m.email ?? null)}, ${sqlArr(m.tags)}, 'published', ${m.featured})`,
    )
    .join(",\n") +
    "\non conflict (id) do update set slug = excluded.slug, name = excluded.name, about = excluded.about, address = excluded.address, city = excluded.city, province = excluded.province, postal_code = excluded.postal_code, lat = excluded.lat, lng = excluded.lng, geofence_radius_m = excluded.geofence_radius_m, website = excluded.website, phone = excluded.phone, email = excluded.email, tags = excluded.tags, status = excluded.status, featured = excluded.featured;\n",
);

lines.push("delete from public.market_schedules;\n");
lines.push(
  "insert into public.market_schedules (market_id, weekday, opens_at, closes_at, season_start, season_end, notes) values",
);
const scheduleRows: string[] = [];
for (const m of launchMarkets) {
  for (const s of m.schedules) {
    scheduleRows.push(
      `  (${sqlStr(m.id)}, ${s.weekday}, ${sqlStr(s.opens_at)}, ${sqlStr(s.closes_at)}, ${sqlStr(s.season_start)}, ${sqlStr(s.season_end)}, ${sqlStr(s.notes)})`,
    );
  }
}
lines.push(scheduleRows.join(",\n") + ";\n");

lines.push("delete from public.market_vendors;");
lines.push("delete from public.vendor_menus;");
lines.push("delete from public.vendors;\n");

if (launchVendors.length) {
  lines.push(
    "insert into public.vendors (id, slug, name, about, website, instagram, phone, tags, status) values",
  );
  lines.push(
    launchVendors
      .map(
        (v) =>
          `  (${sqlStr(v.id)}, ${sqlStr(v.slug)}, ${sqlStr(v.name)}, ${sqlStr(v.about)}, ${sqlStr(v.website)}, ${sqlStr(v.instagram ?? null)}, ${sqlStr(v.phone)}, ${sqlArr(v.tags)}, 'published')`,
      )
      .join(",\n") + "\non conflict (id) do nothing;\n",
  );
}

const menuRows: string[] = [];
for (const v of launchVendors) {
  for (const item of v.menus) {
    menuRows.push(
      `  (${sqlStr(v.id)}, ${sqlStr(item.name)}, ${sqlStr(item.description)}, ${item.price_cents ?? "null"}, ${sqlStr(item.season)}, ${sqlArr(item.dietary)})`,
    );
  }
}
if (menuRows.length) {
  lines.push(
    "insert into public.vendor_menus (vendor_id, name, description, price_cents, season, dietary) values",
  );
  lines.push(menuRows.join(",\n") + ";\n");
}

if (launchLinks.length) {
  lines.push(
    "insert into public.market_vendors (market_id, vendor_id, stall, days) values",
  );
  lines.push(
    launchLinks
      .map(
        (mv) =>
          `  (${sqlStr(mv.market_id)}, ${sqlStr(mv.vendor_id)}, ${sqlStr(mv.stall)}, ${sqlArr(mv.days)})`,
      )
      .join(",\n") + "\non conflict (market_id, vendor_id) do nothing;\n",
  );
}

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed.sql");
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out}`);
