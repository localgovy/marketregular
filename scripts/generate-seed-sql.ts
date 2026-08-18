import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  seedMarketVendors,
  seedMarkets,
  seedVendors,
} from "../src/data/directory.ts";

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
  "-- Generated from src/data/directory.ts — re-run scripts/generate-seed-sql.ts after seed edits",
  "insert into public.markets (id, slug, name, about, address, city, province, postal_code, lat, lng, geofence_radius_m, website, phone, email, tags, status, featured) values",
];

lines.push(
  seedMarkets
    .map(
      (m) =>
        `  (${sqlStr(m.id)}, ${sqlStr(m.slug)}, ${sqlStr(m.name)}, ${sqlStr(m.about)}, ${sqlStr(m.address)}, ${sqlStr(m.city)}, ${sqlStr(m.province)}, ${sqlStr(m.postal_code)}, ${m.lat}, ${m.lng}, ${m.geofence_radius_m}, ${sqlStr(m.website)}, ${sqlStr(m.phone)}, ${sqlStr(m.email ?? null)}, ${sqlArr(m.tags)}, 'published', ${m.featured})`,
    )
    .join(",\n") + "\non conflict (id) do nothing;\n",
);

lines.push(
  "insert into public.market_schedules (market_id, weekday, opens_at, closes_at, season_start, season_end, notes) values",
);
const scheduleRows: string[] = [];
for (const m of seedMarkets) {
  for (const s of m.schedules) {
    scheduleRows.push(
      `  (${sqlStr(m.id)}, ${s.weekday}, ${sqlStr(s.opens_at)}, ${sqlStr(s.closes_at)}, ${sqlStr(s.season_start)}, ${sqlStr(s.season_end)}, ${sqlStr(s.notes)})`,
    );
  }
}
lines.push(scheduleRows.join(",\n") + ";\n");

lines.push(
  "insert into public.vendors (id, slug, name, about, website, phone, tags, status) values",
);
lines.push(
  seedVendors
    .map(
      (v) =>
        `  (${sqlStr(v.id)}, ${sqlStr(v.slug)}, ${sqlStr(v.name)}, ${sqlStr(v.about)}, ${sqlStr(v.website)}, ${sqlStr(v.phone)}, ${sqlArr(v.tags)}, 'published')`,
    )
    .join(",\n") + "\non conflict (id) do nothing;\n",
);

const menuRows: string[] = [];
for (const v of seedVendors) {
  for (const item of v.menus) {
    menuRows.push(
      `  (${sqlStr(v.id)}, ${sqlStr(item.name)}, ${sqlStr(item.description)}, ${item.price_cents ?? "null"}, ${sqlStr(item.season)}, ${sqlArr(item.dietary)})`,
    );
  }
}
lines.push(
  "insert into public.vendor_menus (vendor_id, name, description, price_cents, season, dietary) values",
);
lines.push(menuRows.join(",\n") + ";\n");

lines.push(
  "insert into public.market_vendors (market_id, vendor_id, stall, days) values",
);
lines.push(
  seedMarketVendors
    .map(
      (mv) =>
        `  (${sqlStr(mv.market_id)}, ${sqlStr(mv.vendor_id)}, ${sqlStr(mv.stall)}, ${sqlArr(mv.days)})`,
    )
    .join(",\n") + "\non conflict (market_id, vendor_id) do nothing;\n",
);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "seed.sql");
writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out}`);
