import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = "supabase/migrations/20261015131015_pet_food_product_category.sql";
const searchTerms = "supabase/migrations/20261009173000_search_term_classifiers.sql";

const MARKET = "55555555-5555-4555-8555-555555555555";
const VENDOR = "44444444-4444-4444-8444-444444444444";
const PET = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TURKEY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PUMPKIN = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function extractFunction(relativePath: string, name: string) {
  const sql = readFileSync(join(root, relativePath), "utf8");
  const lowered = sql.toLowerCase();
  const signature = `create or replace function public.${name.toLowerCase()}`;
  const createAt = lowered.indexOf(signature);
  if (createAt < 0) throw new Error(`Missing ${name} in ${relativePath}`);
  const header = sql.slice(createAt);
  const asMatch = header.match(/\bas\s+(\$[A-Za-z0-9_]*\$)/);
  if (!asMatch || asMatch.index == null) throw new Error(`Missing body for ${name}`);
  const tag = asMatch[1]!;
  const bodyAt = createAt + asMatch.index + asMatch[0].length;
  const close = sql.indexOf(tag, bodyAt);
  if (close < 0) throw new Error(`Unclosed ${name}`);
  const end = sql.indexOf(";", close + tag.length);
  if (end < 0) throw new Error(`Missing semicolon after ${name}`);
  return sql.slice(createAt, end + 1);
}

function extractConstraint() {
  const sql = readFileSync(join(root, migration), "utf8");
  const start = sql.indexOf("alter table public.vendor_menus");
  const end = sql.indexOf(";", sql.indexOf("add constraint vendor_menus_product_category_chk"));
  if (start < 0 || end < 0) throw new Error("Missing product_category constraint");
  return sql.slice(start, end + 1);
}

const schema = `
create table public.vendors (
  id uuid primary key,
  slug text not null,
  name text not null,
  status text not null default 'published'
);
create table public.markets (
  id uuid primary key,
  slug text not null,
  name text not null,
  status text not null default 'published'
);
create table public.market_vendors (
  market_id uuid not null references public.markets (id),
  vendor_id uuid not null references public.vendors (id),
  days smallint[] not null default '{6}'
);
create table public.market_schedules (
  market_id uuid not null references public.markets (id),
  weekday smallint not null,
  closes_at time not null default '14:00',
  season_start text,
  season_end text
);
create table public.vendor_menus (
  id uuid primary key,
  vendor_id uuid not null references public.vendors (id),
  name text not null,
  product_category text,
  product_slug text,
  price_cents integer
);
create table public.product_synonyms (
  term text,
  canonical text,
  category text
);
create table public.search_terms (
  term text primary key
);
create table public.search_term_classifiers (
  term text,
  classifier_slug text,
  weight smallint
);
create table public.vendor_menu_classifier_assignments (
  menu_id uuid,
  classifier_slug text
);

create function similarity(text, text)
returns real
language sql
immutable
as $$ select 0.0::real $$;

create function trgm_like(text, text)
returns boolean
language sql
immutable
as $$ select false $$;

create operator % (
  leftarg = text,
  rightarg = text,
  procedure = trgm_like
);

${extractConstraint()}
${extractFunction(searchTerms, "search_query_parts")}
${extractFunction(migration, "search_products")}
`;

type SearchRow = {
  item_name: string;
  product_category: string | null;
};

async function database() {
  const db = new PGlite();
  await db.exec(schema);
  await db.query(
    "insert into public.markets (id, slug, name) values ($1, 'saturday-market', 'Saturday market')",
    [MARKET],
  );
  await db.query(
    "insert into public.vendors (id, slug, name) values ($1, 'river-farm', 'River farm')",
    [VENDOR],
  );
  await db.query(
    "insert into public.market_vendors (market_id, vendor_id, days) values ($1, $2, '{6}')",
    [MARKET, VENDOR],
  );
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ($1, $4, 'Turkey pumpkin beef dessert dog treats', 'pet-food', 'dog-treats'),
      ($2, $4, 'Heritage turkey', 'meat-and-turkey', 'turkey'),
      ($3, $4, 'Pumpkin pie', 'pies-and-sweets', 'pumpkin-pie')`,
    [PET, TURKEY, PUMPKIN, VENDOR],
  );
  return db;
}

async function search(db: PGlite, q: string) {
  const result = await db.query<SearchRow>("select item_name, product_category from public.search_products($1)", [
    q,
  ]);
  return result.rows;
}

test("the constraint accepts pet-food and rejects unknown categories", async () => {
  const db = await database();
  const kibble = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const invalid = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Kibble', 'pet-food')",
    [kibble, VENDOR],
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Nope', 'not-a-category')",
        [invalid, VENDOR],
      ),
    /product_category|check|violat/i,
  );
});

test("turkey and pumpkin return no pet-food items and dog treats does", async () => {
  const db = await database();

  const turkey = await search(db, "turkey");
  assert.ok(turkey.some((row) => row.item_name === "Heritage turkey"));
  assert.equal(
    turkey.some((row) => row.product_category === "pet-food"),
    false,
  );

  const pumpkin = await search(db, "pumpkin");
  assert.ok(pumpkin.some((row) => row.item_name === "Pumpkin pie"));
  assert.equal(
    pumpkin.some((row) => row.product_category === "pet-food"),
    false,
  );

  const beef = await search(db, "beef");
  assert.equal(
    beef.some((row) => row.product_category === "pet-food"),
    false,
  );

  const dessert = await search(db, "dessert");
  assert.equal(
    dessert.some((row) => row.product_category === "pet-food"),
    false,
  );

  const dogTreats = await search(db, "dog treats");
  assert.ok(dogTreats.some((row) => row.product_category === "pet-food"));
  assert.ok(dogTreats.some((row) => row.item_name === "Turkey pumpkin beef dessert dog treats"));
});
