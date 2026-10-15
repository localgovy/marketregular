import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = "supabase/migrations/20261015190000_taxonomy_upgrade.sql";

const MARKET = "55555555-5555-4555-8555-555555555555";
const VENDOR = "44444444-4444-4444-8444-444444444444";
const EARRINGS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HOUSEPLANT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BACO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CABERNET = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const VINEGAR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const GLASSES = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const GIFT_CARD = "11111111-aaaa-4111-8111-111111111111";
const GIFT_WINE = "22222222-aaaa-4222-8222-222222222222";
const RINGS = "33333333-aaaa-4333-8333-333333333333";
const ONION_RINGS = "44444444-aaaa-4444-8444-444444444444";
const PET = "55555555-aaaa-4555-8555-555555555555";
const TURKEY = "66666666-aaaa-4666-8666-666666666666";
const PUMPKIN = "77777777-aaaa-4777-8777-777777777777";
const SWEATER = "88888888-aaaa-4888-8888-888888888888";

function extractFunction(name: string) {
  const sql = readFileSync(join(root, migration), "utf8");
  const lowered = sql.toLowerCase();
  const signature = `create or replace function public.${name.toLowerCase()}`;
  const createAt = lowered.indexOf(signature);
  if (createAt < 0) throw new Error(`Missing ${name} in ${migration}`);
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

function extractThrough(marker: string) {
  const sql = readFileSync(join(root, migration), "utf8");
  const start = sql.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${marker}`);
  const addAt = sql.indexOf("add constraint", start);
  const end = sql.indexOf(";", addAt);
  if (end < 0) throw new Error(`Missing constraint after ${marker}`);
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
create table public.menu_classifiers (
  slug text primary key,
  facet text not null,
  value text not null,
  label text not null
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

${extractThrough("alter table public.vendor_menus")}
${extractThrough("alter table public.menu_classifiers")}
${extractFunction("search_term_match")}
${extractFunction("search_query_parts")}
${extractFunction("search_products")}
`;

type SearchRow = {
  item_name: string;
  product_category: string | null;
};

type PartRow = {
  part_kind: string;
  part_value: string;
  part_ord: number;
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
  await db.exec(`
    insert into public.search_terms (term) values
      ('earrings'),
      ('hoops'),
      ('houseplants'),
      ('red wine'),
      ('gift card'),
      ('rings'),
      ('turkey'),
      ('dumplings'),
      ('berry');
    insert into public.search_term_classifiers (term, classifier_slug, weight) values
      ('earrings', 'kind.earrings', 3),
      ('hoops', 'kind.earrings', 3),
      ('houseplants', 'kind.houseplants', 3),
      ('red wine', 'kind.red-wine', 3),
      ('gift card', 'kind.gift-cards', 3),
      ('rings', 'kind.rings', 3),
      ('turkey', 'kind.turkey', 3),
      ('dumplings', 'kind.dumplings', 3),
      ('berry', 'kind.berries', 3);
  `);
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ($1, $15, 'Sterling hoop earrings', 'jewellery-and-accessories', 'earrings'),
      ($2, $15, 'Hoya houseplant', null, 'houseplants'),
      ($3, $15, 'Baco Noir', 'alcohol', 'wine'),
      ($4, $15, 'Cabernet Franc', 'alcohol', 'wine'),
      ($5, $15, 'Red Wine Vinegar', 'preserves-and-sauces', 'vinegar'),
      ($6, $15, 'Red Wine Glass Set', 'home-and-kitchen', 'glassware'),
      ($7, $15, 'Market gift card', 'candles-and-crafts', 'gift-cards'),
      ($8, $15, 'Gift Card Reserve', 'alcohol', 'wine'),
      ($9, $15, 'Silver band', 'jewellery-and-accessories', 'rings'),
      ($10, $15, 'Onion rings', 'prepared-foods', 'onion-rings'),
      ($11, $15, 'Turkey pumpkin beef dessert dog treats', 'pet-food', 'dog-treats'),
      ($12, $15, 'Heritage turkey', 'meat-and-turkey', 'turkey'),
      ($13, $15, 'Pumpkin pie', 'pies-and-sweets', 'pumpkin-pie'),
      ($14, $15, 'Merino sweater', 'clothing-and-accessories', 'sweaters')`,
    [
      EARRINGS,
      HOUSEPLANT,
      BACO,
      CABERNET,
      VINEGAR,
      GLASSES,
      GIFT_CARD,
      GIFT_WINE,
      RINGS,
      ONION_RINGS,
      PET,
      TURKEY,
      PUMPKIN,
      SWEATER,
      VENDOR,
    ],
  );
  await db.exec(`
    insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug) values
      ('${EARRINGS}', 'kind.earrings'),
      ('${HOUSEPLANT}', 'kind.houseplants'),
      ('${BACO}', 'kind.red-wine'),
      ('${CABERNET}', 'kind.red-wine'),
      ('${VINEGAR}', 'kind.vinegars'),
      ('${GLASSES}', 'kind.glassware'),
      ('${GIFT_CARD}', 'kind.gift-cards'),
      ('${RINGS}', 'kind.rings'),
      ('${TURKEY}', 'kind.turkey');
  `);
  return db;
}

async function search(db: PGlite, q: string) {
  const result = await db.query<SearchRow>("select item_name, product_category from public.search_products($1)", [
    q,
  ]);
  return result.rows;
}

function indexOf(rows: SearchRow[], name: string) {
  return rows.findIndex((row) => row.item_name === name);
}

test("the constraints accept new categories and facets", async () => {
  const db = await database();
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Kibble', 'pet-food')",
    ["99999999-aaaa-4999-8999-999999999999", VENDOR],
  );
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Toque', 'clothing-and-accessories')",
    ["aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaa1", VENDOR],
  );
  await db.query(
    "insert into public.menu_classifiers (slug, facet, value, label) values ('origin.indian', 'origin', 'indian', 'Indian')",
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Nope', 'not-a-category')",
        ["bbbb1111-aaaa-4bbb-8bbb-bbbbbbbbbbb1", VENDOR],
      ),
    /product_category|check|violat/i,
  );
  await assert.rejects(
    () =>
      db.query(
        "insert into public.menu_classifiers (slug, facet, value, label) values ('goods.socks', 'goods', 'socks', 'Socks')",
      ),
    /facet|check|violat/i,
  );
});

test("singular and plural fallback in search_query_parts", async () => {
  const db = await database();
  const earring = await db.query<PartRow>("select * from public.search_query_parts('earring')");
  assert.equal(earring.rows[0]?.part_kind, "term");
  assert.equal(earring.rows[0]?.part_value, "earrings");

  const dumpling = await db.query<PartRow>("select * from public.search_query_parts('dumpling')");
  assert.equal(dumpling.rows[0]?.part_kind, "term");
  assert.equal(dumpling.rows[0]?.part_value, "dumplings");

  const berries = await db.query<PartRow>("select * from public.search_query_parts('berries')");
  assert.equal(berries.rows[0]?.part_kind, "term");
  assert.equal(berries.rows[0]?.part_value, "berry");

  const redWines = await db.query<PartRow>("select * from public.search_query_parts('red wines')");
  assert.equal(redWines.rows[0]?.part_kind, "term");
  assert.equal(redWines.rows[0]?.part_value, "red wine");
});

test("earrings, houseplants, gift card, and clothing match through the non-food gate", async () => {
  const db = await database();

  const earrings = await search(db, "earrings");
  assert.ok(earrings.some((row) => row.item_name === "Sterling hoop earrings"));

  const earring = await search(db, "earring");
  assert.ok(earring.some((row) => row.item_name === "Sterling hoop earrings"));

  const hoops = await search(db, "hoops");
  assert.ok(hoops.some((row) => row.item_name === "Sterling hoop earrings"));

  const houseplants = await search(db, "houseplants");
  assert.ok(houseplants.some((row) => row.item_name === "Hoya houseplant"));
  assert.ok(houseplants.some((row) => row.product_category == null));

  const houseplant = await search(db, "houseplant");
  assert.ok(houseplant.some((row) => row.item_name === "Hoya houseplant"));

  const gift = await search(db, "gift card");
  assert.ok(gift.some((row) => row.item_name === "Market gift card"));
  const giftAt = indexOf(gift, "Market gift card");
  const wineAt = indexOf(gift, "Gift Card Reserve");
  assert.ok(giftAt >= 0);
  if (wineAt >= 0) assert.ok(giftAt < wineAt);

  const sweater = await search(db, "sweater");
  assert.ok(sweater.some((row) => row.item_name === "Merino sweater"));
});

test("red wine ranks tagged wines above vinegar and glasses", async () => {
  const db = await database();
  const rows = await search(db, "red wine");
  const baco = indexOf(rows, "Baco Noir");
  const cabernet = indexOf(rows, "Cabernet Franc");
  const vinegar = indexOf(rows, "Red Wine Vinegar");
  const glasses = indexOf(rows, "Red Wine Glass Set");
  assert.ok(baco >= 0);
  assert.ok(cabernet >= 0);
  assert.ok(vinegar >= 0);
  assert.ok(glasses >= 0);
  assert.ok(baco < vinegar);
  assert.ok(baco < glasses);
  assert.ok(cabernet < vinegar);
  assert.ok(cabernet < glasses);
});

test("rings ranks jewellery above onion rings", async () => {
  const db = await database();
  const rows = await search(db, "rings");
  const silver = indexOf(rows, "Silver band");
  const onion = indexOf(rows, "Onion rings");
  assert.ok(silver >= 0);
  assert.ok(onion >= 0);
  assert.ok(silver < onion);
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
