import { readFileSync, writeFileSync } from "node:fs";
import { guessCountryTags, storedCountryTags } from "../src/lib/country-tags.ts";

type VendorRow = {
  id: string;
  slug?: string;
  name: string;
  about: string | null;
  tags: string[] | null;
};

type QueryEnvelope = { rows?: VendorRow[] };

function sqlStr(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlTextArray(values: string[]) {
  if (!values.length) return `'{}'::text[]`;
  return `ARRAY[${values.map(sqlStr).join(", ")}]::text[]`;
}

function parseVendors(raw: string): VendorRow[] {
  const parsed = JSON.parse(raw) as QueryEnvelope | VendorRow[];
  if (Array.isArray(parsed)) return parsed;
  return parsed.rows ?? [];
}

function mergedTags(row: VendorRow) {
  const current = row.tags ?? [];
  const extra = guessCountryTags(row.name, row.about);
  const have = new Set(current);
  const next = [...current];
  for (const tag of extra) {
    if (!have.has(tag)) {
      next.push(tag);
      have.add(tag);
    }
  }
  return { current, extra, next, added: extra.filter((tag) => !current.includes(tag)) };
}

const args = process.argv.slice(2);
const sqlOut = args.includes("--sql") ? "/tmp/vendor-country-tags.sql" : null;
const input = args.find((arg) => !arg.startsWith("--")) ?? "/tmp/vendors-raw.json";
const vendors = parseVendors(readFileSync(input, "utf8"));
const changes = vendors
  .map((row) => ({ row, ...mergedTags(row) }))
  .filter((item) => item.added.length);

const counts = new Map<string, number>();
for (const item of changes) {
  for (const tag of item.extra) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
}

const already = vendors.filter((row) => storedCountryTags(row.tags ?? []).length).length;
const flagged = [
  "french",
  "thai",
  "chinese",
  "japanese",
  "indian",
  "british",
  "italian",
  "german",
  "korean",
];

console.log(
  JSON.stringify(
    {
      vendors: vendors.length,
      alreadyTagged: already,
      toUpdate: changes.length,
      byTag: [...counts.entries()].sort((a, b) => b[1] - a[1]),
      inspect: Object.fromEntries(
        flagged.map((tag) => [
          tag,
          changes
            .filter((item) => item.added.includes(tag))
            .map((item) => item.row.name),
        ]),
      ),
    },
    null,
    2,
  ),
);

if (sqlOut) {
  const sql = [
    "-- Cuisine / origin tags guessed from vendor name + about. Additive; product tags stay.",
    ...changes.map(
      (item) =>
        `update public.vendors set tags = ${sqlTextArray(item.next)} where id = ${sqlStr(item.row.id)};`,
    ),
    "",
  ].join("\n");
  writeFileSync(sqlOut, sql);
  console.error(`wrote ${sqlOut} (${changes.length} updates)`);
}
