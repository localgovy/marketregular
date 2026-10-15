import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const constraints = "supabase/migrations/20261015190000_taxonomy_upgrade.sql";
const migration = "supabase/migrations/20261015203000_search_cuisine_and_goods_terms.sql";

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
const GREETING = "1d1d1d1d-1d1d-41d1-81d1-1d1d1d1d1d1d";
const CANDIED = "1c1c1c1c-1c1c-41c1-81c1-1c1c1c1c1c1c";
const ETHIOPIAN_VENDOR = "12121212-1212-4121-8121-121212121212";
const FILIPINO_VENDOR = "13131313-1313-4131-8131-131313131313";
const MIDDLE_VENDOR = "1e1e1e1e-1e1e-41e1-81e1-1e1e1e1e1e1e";
const INDIAN_VENDOR = "1f1f1f1f-1f1f-41f1-81f1-1f1f1f1f1f1f";
const DORO = "14141414-1414-4141-8141-141414141414";
const MISIR = "15151515-1515-4151-8151-151515151515";
const PLATTER = "16161616-1616-4161-8161-161616161616";
const ETH_PET = "17171717-1717-4171-8171-171717171717";
const LUMPIA = "18181818-1818-4181-8181-181818181818";
const ADOBO = "19191919-1919-4191-8191-191919191919";
const PANDESAL = "1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a1a";
const FIL_PET = "1b1b1b1b-1b1b-41b1-81b1-1b1b1b1b1b1b";
const CURRY = "2a2a2a2a-2a2a-42a2-82a2-2a2a2a2a2a2a";
const BUTTER_CHICKEN = "2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b";
const POT_PIE = "2c2c2c2c-2c2c-42c2-82c2-2c2c2c2c2c2c";
const HUMMUS = "2d2d2d2d-2d2d-42d2-82d2-2d2d2d2d2d2d";

function extractFunction(name: string, file = constraints) {
  const sql = readFileSync(join(root, file), "utf8");
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
  const sql = readFileSync(join(root, constraints), "utf8");
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
  status text not null default 'published',
  tags text[] not null default '{}'
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
${extractFunction("search_products", migration)}
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
      ('berry'),
      ('indian'),
      ('necklaces');
    insert into public.search_term_classifiers (term, classifier_slug, weight) values
      ('earrings', 'kind.earrings', 3),
      ('hoops', 'kind.earrings', 3),
      ('houseplants', 'kind.houseplants', 3),
      ('red wine', 'kind.red-wine', 3),
      ('gift card', 'kind.gift-cards', 3),
      ('rings', 'kind.rings', 3),
      ('turkey', 'kind.turkey', 3),
      ('dumplings', 'kind.dumplings', 3),
      ('berry', 'kind.berries', 3),
      ('indian', 'kind.curry', 2),
      ('necklaces', 'kind.necklaces', 3);
  `);
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ($1, $15, 'Sterling hoop earrings', 'jewellery-and-accessories', 'earrings'),
      ($2, $15, 'Hoya houseplant', null, 'houseplants'),
      ($3, $15, 'Baco Noir', 'alcohol', 'wine'),
      ($4, $15, 'Cabernet Franc', 'alcohol', 'wine'),
      ($5, $15, 'Red Wine Vinegar', 'preserves-and-sauces', 'vinegar'),
      ($6, $15, 'Red Wine Glass Set', 'home-and-kitchen', 'glassware'),
      ($7, $15, 'Market gift card', 'services', 'gift-cards'),
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
  await db.query(
    `insert into public.vendors (id, slug, name, tags) values
      ($1, 'gebeta', 'Gebeta', '{ethiopian}'),
      ($2, 'fiesta', 'Fiesta', '{filipino}'),
      ($3, 'mezze', 'Mezze', '{middle-eastern}'),
      ($4, 'masala', 'Masala', '{indian}')`,
    [ETHIOPIAN_VENDOR, FILIPINO_VENDOR, MIDDLE_VENDOR, INDIAN_VENDOR],
  );
  await db.query(
    `insert into public.market_vendors (market_id, vendor_id, days) values
      ($1, $2, '{6}'),
      ($1, $3, '{6}'),
      ($1, $4, '{6}'),
      ($1, $5, '{6}')`,
    [MARKET, ETHIOPIAN_VENDOR, FILIPINO_VENDOR, MIDDLE_VENDOR, INDIAN_VENDOR],
  );
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ($1, $2, 'Wedding gift card greeting card', 'art-and-stationery', 'greeting-cards'),
      ($3, $4, 'Candied hoop earrings', 'prepared-foods', 'candied-earrings'),
      ($5, $6, 'Doro wat', 'prepared-foods', 'doro-wat'),
      ($7, $6, 'Misir wat', 'prepared-foods', 'misir-wat'),
      ($8, $6, 'Ethiopian platter', 'prepared-foods', 'ethiopian-platter'),
      ($9, $6, 'Ethiopian dog treats', 'pet-food', 'ethiopian-dog-treats'),
      ($10, $11, 'Lumpia', 'prepared-foods', 'lumpia'),
      ($12, $11, 'Chicken adobo', 'prepared-foods', 'adobo'),
      ($13, $11, 'Pandesal', 'bread-and-bakery', 'pandesal'),
      ($14, $11, 'Filipino dog treats', 'pet-food', 'filipino-dog-treats'),
      ($15, $20, 'Vegetable samosa', 'prepared-foods', 'samosas'),
      ($16, $20, 'Butter chicken', 'prepared-foods', 'butter-chicken'),
      ($17, $20, 'Chicken pot pie', 'prepared-foods', 'pot-pie'),
      ($18, $19, 'Hummus', 'prepared-foods', 'hummus')`,
    [
      GREETING,
      VENDOR,
      CANDIED,
      VENDOR,
      DORO,
      ETHIOPIAN_VENDOR,
      MISIR,
      PLATTER,
      ETH_PET,
      LUMPIA,
      FILIPINO_VENDOR,
      ADOBO,
      PANDESAL,
      FIL_PET,
      CURRY,
      BUTTER_CHICKEN,
      POT_PIE,
      HUMMUS,
      MIDDLE_VENDOR,
      INDIAN_VENDOR,
    ],
  );
  await db.exec(`
    insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug) values
      ('${DORO}', 'origin.ethiopian'),
      ('${BUTTER_CHICKEN}', 'origin.indian'),
      ('${CURRY}', 'kind.curry');
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
  const greetingAt = indexOf(gift, "Wedding gift card greeting card");
  assert.ok(giftAt >= 0);
  assert.equal(gift[giftAt]?.product_category, "services");
  if (wineAt >= 0) assert.ok(giftAt < wineAt);
  assert.ok(greetingAt >= 0);
  assert.ok(giftAt < greetingAt);
  assert.equal(gift[greetingAt]?.product_category, "art-and-stationery");
  const giftCards = await search(db, "gift cards");
  const pluralAt = indexOf(giftCards, "Market gift card");
  const pluralGreeting = indexOf(giftCards, "Wedding gift card greeting card");
  assert.ok(pluralAt >= 0);
  assert.ok(pluralGreeting < 0 || pluralAt < pluralGreeting);

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

test("rings does not return onion rings, and onion rings still finds them", async () => {
  const db = await database();
  const rows = await search(db, "rings");
  const silver = indexOf(rows, "Silver band");
  assert.ok(silver >= 0);
  assert.equal(indexOf(rows, "Onion rings"), -1);
  assert.equal(
    rows.some((row) => row.product_category === "prepared-foods"),
    false,
  );

  const singular = await search(db, "ring");
  assert.ok(singular.some((row) => row.item_name === "Silver band"));
  assert.equal(indexOf(singular, "Onion rings"), -1);

  const onionRings = await search(db, "onion rings");
  assert.ok(onionRings.some((row) => row.item_name === "Onion rings"));

  const earrings = await search(db, "earrings");
  assert.ok(earrings.some((row) => row.item_name === "Sterling hoop earrings"));
  assert.equal(indexOf(earrings, "Candied hoop earrings"), -1);

  const necklaces = await search(db, "necklaces");
  assert.equal(
    necklaces.some((row) => row.product_category === "prepared-foods"),
    false,
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

test("cuisine search uses vendor tags under origin tags and skips pet food", async () => {
  const db = await database();

  const ethiopian = await search(db, "ethiopian");
  assert.ok(ethiopian.length > 0);
  assert.equal(indexOf(ethiopian, "Ethiopian dog treats"), -1);
  assert.equal(
    ethiopian.some((row) => row.product_category === "pet-food"),
    false,
  );
  const doro = indexOf(ethiopian, "Doro wat");
  const misir = indexOf(ethiopian, "Misir wat");
  const platter = indexOf(ethiopian, "Ethiopian platter");
  assert.ok(doro >= 0);
  assert.ok(misir >= 0);
  assert.ok(platter >= 0);
  assert.ok(doro < misir);
  assert.ok(doro < platter);

  const ethiopianFood = await search(db, "ethiopian food");
  assert.ok(ethiopianFood.some((row) => row.item_name === "Misir wat"));
  assert.equal(indexOf(ethiopianFood, "Ethiopian dog treats"), -1);

  const filipino = await search(db, "filipino");
  assert.ok(filipino.length >= 3);
  assert.ok(filipino.some((row) => row.item_name === "Lumpia"));
  assert.ok(filipino.some((row) => row.item_name === "Chicken adobo"));
  assert.ok(filipino.some((row) => row.item_name === "Pandesal"));
  assert.equal(
    filipino.some((row) => row.product_category === "pet-food"),
    false,
  );

  const filipinoFood = await search(db, "filipino food");
  assert.ok(filipinoFood.length >= 3);
  assert.equal(
    filipinoFood.some((row) => row.product_category === "pet-food"),
    false,
  );

  const indian = await search(db, "indian");
  const butter = indexOf(indian, "Butter chicken");
  const samosa = indexOf(indian, "Vegetable samosa");
  const pie = indexOf(indian, "Chicken pot pie");
  assert.ok(butter >= 0);
  assert.ok(samosa >= 0);
  assert.ok(pie >= 0);
  assert.ok(butter < samosa);
  assert.ok(samosa < pie);

  const middle = await search(db, "middle eastern");
  assert.ok(middle.some((row) => row.item_name === "Hummus"));
  const middleFood = await search(db, "middle-eastern food");
  assert.ok(middleFood.some((row) => row.item_name === "Hummus"));
});
