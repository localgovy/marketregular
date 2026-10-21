import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const constraints = "supabase/migrations/20261015190000_taxonomy_upgrade.sql";
const migration = "supabase/migrations/20261016195249_rose_keeps_flower_meaning.sql";
const giftsMigration = "supabase/migrations/20261018154000_gifts_and_sets_product_category.sql";
const searchMigration =
  "supabase/migrations/20261021005523_menu_item_photos.sql";

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
  if (createAt < 0) throw new Error(`Missing ${name} in ${file}`);
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

function extractThrough(marker: string, file = constraints) {
  const sql = readFileSync(join(root, file), "utf8");
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

create function public.fold_search_text(input text)
returns text
language sql
immutable
strict
as $$
  select translate(
    lower(input),
    'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÝŸýÿÑñÇç',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuYYyyNnCc'
  )
$$;

${extractThrough("alter table public.vendor_menus", giftsMigration)}
${extractThrough("alter table public.menu_classifiers")}
${extractFunction("search_term_is_alcohol", migration)}
${extractFunction("search_alcohol_term_hit", migration)}
${extractFunction("search_term_match", migration)}
${extractFunction("search_query_parts", migration)}

create function public.set_limit(real)
returns real
language sql
volatile
as $$ select $1 $$;

create table public.menu_item_photos (
  menu_id uuid primary key references public.vendor_menus (id) on delete cascade,
  image_url text not null
);

${extractFunction("search_products", searchMigration)}
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
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Cotton onesie', 'baby')",
    ["99999999-bbbb-4999-8999-999999999999", VENDOR],
  );
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Honey Gift Box', 'gifts-and-sets')",
    ["99999999-cccc-4999-8999-999999999999", VENDOR],
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

test("the search migration keeps null-category matches, pet food, trigram, accents, and the alcohol gate", () => {
  const gifts = readFileSync(join(root, giftsMigration), "utf8");
  const sql = readFileSync(join(root, searchMigration), "utf8");
  const helpers = readFileSync(join(root, migration), "utf8");
  assert.match(gifts, /'baby'::text,\s*'gifts-and-sets'::text/);
  assert.match(sql, /vm\.product_category is null\s+and match\.existing/);
  assert.match(sql, /when vm\.product_category is null then 0\.01/);
  assert.match(sql, /vm\.product_category = 'pet-food'/);
  assert.match(sql, /vm\.product_category = 'baby'/);
  assert.match(sql, /baby_query\.allow/);
  assert.match(sql, /vm\.product_category = 'alcohol'/);
  assert.match(sql, /alcohol_query\.allow/);
  assert.match(sql, /vm\.product_category is distinct from 'baby'/);
  assert.match(sql, /vm\.product_category is distinct from 'alcohol'/);
  assert.match(sql, /\('baby'\),\s*\('gifts-and-sets'\)/);
  assert.match(sql, /'garden-and-outdoor',\s*'gifts-and-sets'/);
  assert.match(sql, /from candidates cand/);
  assert.match(sql, /public\.set_limit\(0\.3\)/);
  assert.doesNotMatch(sql, /gifts_query/);
  assert.match(sql, /public\.fold_search_text\(vm\.name\) % public\.fold_search_text\(clock\.query\)/);
  assert.match(sql, /similarity\(public\.fold_search_text\(vm\.name\), public\.fold_search_text\(clock\.query\)\) >= 0\.45/);
  assert.match(helpers, /not hits\.term_plain/);
  assert.match(sql, /search_alcohol_term_hit/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /grant execute on function public\.search_products/);
  assert.doesNotMatch(sql, /security definer/i);
  assert.match(sql, /partition by ranked\.vendor_id/);
  assert.match(sql, /ranked\.score - \(ranked\.vendor_rank - 1\) desc/);
  assert.match(sql, /left join public\.menu_item_photos mip/);
  assert.match(sql, /on mip\.menu_id = vm\.id/);
  assert.match(sql, /ranked\.image_url/);
  assert.match(sql, /image_url text/);
  assert.match(
    sql,
    /create or replace function public\.search_products\(\s*q text,\s*open_today boolean default false,\s*market_slug text default null,\s*day integer default null,\s*lim integer default 40,\s*off integer default 0\s*\)/,
  );
});

test("search_products returns the picture stored for that menu row", async () => {
  const db = await database();
  const url =
    "https://pxsndrlptceafhsxfays.supabase.co/storage/v1/object/public/menu-photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/hoops.webp";
  await db.query("insert into public.menu_item_photos (menu_id, image_url) values ($1, $2)", [
    EARRINGS,
    url,
  ]);
  const result = await db.query<{ item_name: string; image_url: string | null }>(
    "select item_name, image_url from public.search_products('earrings')",
  );
  const sterling = result.rows.find((row) => row.item_name === "Sterling hoop earrings");
  assert.equal(sterling?.image_url, url);
  assert.equal(
    result.rows.some((row) => row.item_name !== "Sterling hoop earrings" && row.image_url === url),
    false,
  );
});

test("balm, calendula, and powder return no baby items and baby queries do", async () => {
  const db = await database();
  const bum = "b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0";
  const powder = "b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1";
  const lip = "b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2";
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ($1, $4, 'Calendula bum balm', 'baby', 'bum-balm'),
      ($2, $4, 'Lavender baby powder', 'baby', 'baby-powder'),
      ($3, $4, 'Calendula lip balm', 'body-care', 'lip-balm')`,
    [bum, powder, lip, VENDOR],
  );

  const balm = await search(db, "balm");
  assert.equal(balm.some((row) => row.product_category === "baby"), false);
  assert.equal(indexOf(balm, "Calendula bum balm"), -1);
  assert.ok(balm.some((row) => row.item_name === "Calendula lip balm"));

  const calendula = await search(db, "calendula");
  assert.equal(calendula.some((row) => row.product_category === "baby"), false);
  assert.equal(indexOf(calendula, "Calendula bum balm"), -1);
  assert.equal(indexOf(calendula, "Lavender baby powder"), -1);

  const powderRows = await search(db, "powder");
  assert.equal(powderRows.some((row) => row.product_category === "baby"), false);
  assert.equal(indexOf(powderRows, "Lavender baby powder"), -1);

  const baby = await search(db, "baby");
  assert.ok(baby.some((row) => row.item_name === "Lavender baby powder"));
  assert.equal(baby.some((row) => row.product_category === "baby"), true);
  assert.equal(indexOf(baby, "Calendula lip balm"), -1);

  const babyPowder = await search(db, "baby powder");
  assert.ok(babyPowder.some((row) => row.item_name === "Lavender baby powder"));
  assert.equal(babyPowder.some((row) => row.product_category === "baby"), true);
  assert.equal(indexOf(babyPowder, "Calendula lip balm"), -1);
});

test("gift box queries return gifts-and-sets rows", async () => {
  const db = await database();
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Honey Gift Box', 'gifts-and-sets')",
    ["c0c0c0c0-c0c0-41c0-81c0-c0c0c0c0c0c0", VENDOR],
  );

  const giftBox = await search(db, "gift box");
  assert.ok(giftBox.some((row) => row.item_name === "Honey Gift Box"));
  assert.equal(
    giftBox.find((row) => row.item_name === "Honey Gift Box")?.product_category,
    "gifts-and-sets",
  );

  const honeyGiftBox = await search(db, "honey gift box");
  assert.ok(honeyGiftBox.some((row) => row.item_name === "Honey Gift Box"));
  assert.equal(
    honeyGiftBox.find((row) => row.item_name === "Honey Gift Box")?.product_category,
    "gifts-and-sets",
  );
});

test("uncategorized published items match by name and rank under categorized rows", async () => {
  const db = await database();
  const draftVendor = "4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b";
  const lonelyVendor = "4f4f4f4f-4f4f-44f4-84f4-4f4f4f4f4f4f";
  await db.exec(`
    insert into public.search_terms (term) values ('milk'), ('tea'), ('beer');
    insert into public.search_term_classifiers (term, classifier_slug, weight) values
      ('milk', 'kind.milk', 3),
      ('tea', 'kind.tea', 3),
      ('beer', 'kind.beer', 3);
  `);
  await db.query(
    `insert into public.vendors (id, slug, name, status) values
      ($1, 'draft-stall', 'Draft stall', 'draft'),
      ($2, 'lonely-stall', 'Lonely stall', 'published')`,
    [draftVendor, lonelyVendor],
  );
  await db.query(
    "insert into public.market_vendors (market_id, vendor_id, days) values ($1, $2, '{6}')",
    [MARKET, draftVendor],
  );
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ('3a3a3a3a-3a3a-43a3-83a3-3a3a3a3a3a3a', $1, 'Taro Milk Tea', null, null),
      ('3b3b3b3b-3b3b-43b3-83b3-3b3b3b3b3b3b', $1, 'Taro Milk Tea', 'prepared-foods', 'taro-milk-tea'),
      ('3c3c3c3c-3c3c-43c3-83c3-3c3c3c3c3c3c', $1, 'Taro Milk Tea', 'beverages', 'taro-milk-tea-plain'),
      ('3d3d3d3d-3d3d-43d3-83d3-3d3d3d3d3d3d', $1, 'Aqua Koshi Chime', null, null),
      ('3e3e3e3e-3e3e-43e3-83e3-3e3e3e3e3e3e', $1, 'Aqua Koshi Chime', 'beverages', 'koshi-chime'),
      ('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a', $1, 'Koshi Chime dog chew', 'pet-food', 'koshi-chew'),
      ('4c4c4c4c-4c4c-44c4-84c4-4c4c4c4c4c4c', $2, 'Hidden Taro Milk Tea', null, null),
      ('4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d', $3, 'Unlisted Taro Milk Tea', null, null),
      ('4e4e4e4e-4e4e-44e4-84e4-4e4e4e4e4e4e', $1, 'Smoked turkey', null, null),
      ('5a5a5a5a-5a5a-45a5-85a5-5a5a5a5a5a5a', $1, 'Hoop earrings', null, null),
      ('5b5b5b5b-5b5b-45b5-85b5-5b5b5b5b5b5b', $1, 'Stacking rings', null, null),
      ('5c5c5c5c-5c5c-45c5-85c5-5c5c5c5c5c5c', $1, 'Pork dumplings', null, null),
      ('5d5d5d5d-5d5d-45d5-85d5-5d5d5d5d5d5d', $1, 'Farmhouse beer', null, null),
      ('5e5e5e5e-5e5e-45e5-85e5-5e5e5e5e5e5e', $1, 'Pilsner', 'alcohol', 'pilsner'),
      ('6a6a6a6a-6a6a-46a6-86a6-6a6a6a6a6a6a', $1, 'Beef beer dog treats', 'pet-food', 'beer-dog'),
      ('6b6b6b6b-6b6b-46b6-86b6-6b6b6b6b6b6b', $1, 'Zzxxyy Tray', null, null),
      ('6c6c6c6c-6c6c-46c6-86c6-6c6c6c6c6c6c', $1, 'Zzxxyy Bowl', 'beverages', 'zzxxyy-bowl'),
      ('6d6d6d6d-6d6d-46d6-86d6-6d6d6d6d6d6d', $1, 'Zzxxyy dog chew', 'pet-food', 'zzxxyy-chew'),
      ('6e6e6e6e-6e6e-46e6-86e6-6e6e6e6e6e6e', $1, 'Mystery crate', null, null)`,
    [VENDOR, draftVendor, lonelyVendor],
  );
  await db.exec(`
    insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug) values
      ('3b3b3b3b-3b3b-43b3-83b3-3b3b3b3b3b3b', 'kind.milk'),
      ('3b3b3b3b-3b3b-43b3-83b3-3b3b3b3b3b3b', 'kind.tea'),
      ('5e5e5e5e-5e5e-45e5-85e5-5e5e5e5e5e5e', 'kind.beer');
  `);

  const taro = await search(db, "Taro Milk Tea");
  const taroNames = taro.filter((row) => row.item_name === "Taro Milk Tea");
  const tagged = taroNames.findIndex((row) => row.product_category === "prepared-foods");
  const plain = taroNames.findIndex((row) => row.product_category === "beverages");
  const uncategorized = taroNames.findIndex((row) => row.product_category == null);
  assert.ok(tagged >= 0);
  assert.ok(plain >= 0);
  assert.ok(uncategorized >= 0);
  assert.ok(tagged < plain);
  assert.ok(plain < uncategorized);
  assert.equal(indexOf(taro, "Hidden Taro Milk Tea"), -1);
  assert.equal(indexOf(taro, "Unlisted Taro Milk Tea"), -1);
  assert.equal(indexOf(taro, "Mystery crate"), -1);

  const koshi = await search(db, "Koshi Chime");
  const koshiCat = indexOf(koshi, "Aqua Koshi Chime");
  assert.ok(koshiCat >= 0);
  assert.equal(koshi[koshiCat]?.product_category, "beverages");
  const koshiNull = koshi.findIndex(
    (row, index) => index > koshiCat && row.item_name === "Aqua Koshi Chime" && row.product_category == null,
  );
  assert.ok(koshiNull >= 0);
  assert.equal(indexOf(koshi, "Koshi Chime dog chew"), -1);
  assert.equal(
    koshi.some((row) => row.product_category === "pet-food"),
    false,
  );

  const turkey = await search(db, "turkey");
  const heritage = indexOf(turkey, "Heritage turkey");
  const smoked = indexOf(turkey, "Smoked turkey");
  assert.ok(heritage >= 0);
  assert.ok(smoked >= 0);
  assert.ok(heritage < smoked);
  assert.equal(turkey[smoked]?.product_category, null);
  assert.equal(
    turkey.some((row) => row.product_category === "pet-food"),
    false,
  );

  const beer = await search(db, "beer");
  const pilsner = indexOf(beer, "Pilsner");
  const farmhouse = indexOf(beer, "Farmhouse beer");
  assert.ok(pilsner >= 0);
  assert.ok(farmhouse >= 0);
  assert.ok(pilsner < farmhouse);
  assert.equal(beer[farmhouse]?.product_category, null);
  assert.equal(
    beer.some((row) => row.product_category === "pet-food"),
    false,
  );

  const earrings = await search(db, "earrings");
  const sterling = indexOf(earrings, "Sterling hoop earrings");
  const hoop = indexOf(earrings, "Hoop earrings");
  assert.ok(sterling >= 0);
  assert.ok(hoop >= 0);
  assert.ok(sterling < hoop);
  assert.equal(earrings[hoop]?.product_category, null);
  assert.equal(indexOf(earrings, "Candied hoop earrings"), -1);

  const rings = await search(db, "rings");
  const silver = indexOf(rings, "Silver band");
  const stacking = indexOf(rings, "Stacking rings");
  assert.ok(silver >= 0);
  assert.ok(stacking >= 0);
  assert.ok(silver < stacking);
  assert.equal(indexOf(rings, "Onion rings"), -1);

  const dumpling = await search(db, "dumpling");
  assert.ok(dumpling.some((row) => row.item_name === "Pork dumplings" && row.product_category == null));
  const dumplings = await search(db, "dumplings");
  assert.ok(dumplings.some((row) => row.item_name === "Pork dumplings" && row.product_category == null));

  const ethiopian = await search(db, "ethiopian");
  assert.equal(indexOf(ethiopian, "Ethiopian dog treats"), -1);
  assert.ok(indexOf(ethiopian, "Doro wat") < indexOf(ethiopian, "Misir wat"));

  await db.exec(`
    create or replace function similarity(text, text)
    returns real
    language sql
    immutable
    as $$
      select case
        when lower($2) = 'zzxxy' and position('zzxxy' in lower($1)) > 0 then 0.55
        else 0
      end::real
    $$;
    create or replace function trgm_like(text, text)
    returns boolean
    language sql
    immutable
    as $$ select public.similarity($1, $2) >= 0.45 $$;
  `);

  const fuzzy = await search(db, "zzxxy");
  const bowl = indexOf(fuzzy, "Zzxxyy Bowl");
  const tray = indexOf(fuzzy, "Zzxxyy Tray");
  assert.ok(bowl >= 0);
  assert.ok(tray >= 0);
  assert.equal(fuzzy[bowl]?.product_category, "beverages");
  assert.equal(fuzzy[tray]?.product_category, null);
  assert.ok(bowl < tray);
  assert.equal(indexOf(fuzzy, "Zzxxyy dog chew"), -1);
  assert.equal(
    fuzzy.some((row) => row.product_category === "pet-food"),
    false,
  );
});

test("accent folding matches rose, creme fraiche, and jalapeno either way", async () => {
  const db = await database();
  await db.exec(`
    insert into public.search_terms (term) values
      ('rosé'),
      ('roses'),
      ('rose wine'),
      ('jalapenos');
    insert into public.search_term_classifiers (term, classifier_slug, weight) values
      ('rosé', 'kind.rose-wine', 3),
      ('roses', 'kind.cut-flowers', 3),
      ('rose wine', 'kind.rose-wine', 3),
      ('jalapenos', 'kind.hot-peppers', 3);
  `);
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a', $1, '2024 Rosé', 'alcohol', 'wine'),
      ('7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b', $1, '2024 Rose', 'alcohol', 'wine'),
      ('7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c', $1, 'Crème Fraîche', 'cheese-and-dairy', null),
      ('7d7d7d7d-7d7d-47d7-87d7-7d7d7d7d7d7d', $1, 'Creme Fraiche', 'cheese-and-dairy', null),
      ('7e7e7e7e-7e7e-47e7-87e7-7e7e7e7e7e7e', $1, 'Crème Fraîche Spirit', 'alcohol', null),
      ('8a8a8a8a-8a8a-48a8-88a8-8a8a8a8a8a8a', $1, 'Jalapeño Poppers', 'prepared-foods', null),
      ('8b8b8b8b-8b8b-48b8-88b8-8b8b8b8b8b8b', $1, 'Jalapeno Salsa', 'preserves-and-sauces', null),
      ('8c8c8c8c-8c8c-48c8-88c8-8c8c8c8c8c8c', $1, 'Roses', 'plants-and-flowers', 'flowers')`,
    [VENDOR],
  );
  await db.exec(`
    insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug) values
      ('7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a', 'kind.rose-wine'),
      ('8a8a8a8a-8a8a-48a8-88a8-8a8a8a8a8a8a', 'kind.hot-peppers'),
      ('8c8c8c8c-8c8c-48c8-88c8-8c8c8c8c8c8c', 'kind.cut-flowers');
  `);

  const roseParts = await db.query<PartRow>("select * from public.search_query_parts('rose')");
  assert.equal(roseParts.rows[0]?.part_kind, "term");
  assert.equal(roseParts.rows[0]?.part_value, "roses");
  const accentParts = await db.query<PartRow>("select * from public.search_query_parts('rosé')");
  assert.equal(accentParts.rows[0]?.part_value, "rosé");
  const roseWineParts = await db.query<PartRow>("select * from public.search_query_parts('rose wine')");
  assert.equal(roseWineParts.rows[0]?.part_kind, "term");
  assert.equal(roseWineParts.rows[0]?.part_value, "rose wine");
  const jalaParts = await db.query<PartRow>("select * from public.search_query_parts('jalapeño')");
  assert.equal(jalaParts.rows[0]?.part_kind, "term");
  assert.equal(jalaParts.rows[0]?.part_value, "jalapenos");
  const cremeParts = await db.query<PartRow>(
    "select part_kind, part_value, part_ord from public.search_query_parts('crème fraîche') order by part_ord",
  );
  assert.deepEqual(
    cremeParts.rows.map((row) => row.part_value),
    ["crème", "fraîche"],
  );

  const plainRose = await search(db, "rose");
  assert.ok(plainRose.some((row) => row.item_name === "Roses" && row.product_category === "plants-and-flowers"));
  assert.equal(
    plainRose.some((row) => row.product_category === "alcohol"),
    false,
  );

  const accentRose = await search(db, "rosé");
  assert.ok(accentRose.some((row) => row.item_name === "2024 Rosé" && row.product_category === "alcohol"));
  assert.ok(accentRose.some((row) => row.item_name === "2024 Rose" && row.product_category === "alcohol"));

  const roseWine = await search(db, "rose wine");
  assert.ok(roseWine.some((row) => row.item_name === "2024 Rosé" && row.product_category === "alcohol"));
  assert.ok(roseWine.some((row) => row.product_category === "alcohol"));

  for (const query of ["crème fraîche", "creme fraiche"]) {
    const rows = await search(db, query);
    assert.ok(rows.some((row) => row.item_name === "Crème Fraîche" && row.product_category === "cheese-and-dairy"));
    assert.ok(rows.some((row) => row.item_name === "Creme Fraiche" && row.product_category === "cheese-and-dairy"));
    assert.equal(
      rows.some((row) => row.product_category === "alcohol"),
      false,
    );
  }

  for (const query of ["jalapeño", "jalapeno"]) {
    const rows = await search(db, query);
    assert.ok(rows.some((row) => row.item_name === "Jalapeño Poppers"));
    assert.ok(rows.some((row) => row.item_name === "Jalapeno Salsa"));
  }

  const roses = await search(db, "roses");
  assert.ok(roses.some((row) => row.item_name === "Roses" && row.product_category === "plants-and-flowers"));
  assert.equal(
    roses.some((row) => row.product_category === "alcohol"),
    false,
  );
});

test("alcohol stays out of food searches and alcohol words still match", async () => {
  const db = await database();
  await db.exec(`
    insert into public.search_terms (term) values
      ('pumpkin pie'),
      ('muffins'),
      ('wine'),
      ('cider'),
      ('gin'),
      ('cabernet');
    insert into public.search_term_classifiers (term, classifier_slug, weight) values
      ('pumpkin pie', 'kind.pumpkin-pie', 3),
      ('muffins', 'kind.muffins', 3),
      ('wine', 'kind.wine', 3),
      ('wine', 'kind.red-wine', 2),
      ('cider', 'kind.hard-cider', 3),
      ('gin', 'kind.gin', 3),
      ('cabernet', 'kind.red-wine', 3);
  `);
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ('8d8d8d8d-8d8d-48d8-88d8-8d8d8d8d8d8d', $1, 'Pumpkin Pie', 'alcohol', null),
      ('8e8e8e8e-8e8e-48e8-88e8-8e8e8e8e8e8e', $1, 'Blueberry Muffin', 'alcohol', null),
      ('9a9a9a9a-9a9a-49a9-89a9-9a9a9a9a9a9a', $1, 'Blueberry muffin', 'bread-and-bakery', 'muffins'),
      ('9b9b9b9b-9b9b-49b9-89b9-9b9b9b9b9b9b', $1, 'Dry Cider', 'alcohol', null),
      ('9c9c9c9c-9c9c-49c9-89c9-9c9c9c9c9c9c', $1, 'Dry Gin', 'alcohol', null),
      ('9d9d9d9d-9d9d-49d9-89d9-9d9d9d9d9d9d', $1, 'House Wine', 'alcohol', 'wine'),
      ('9e9e9e9e-9e9e-49e9-89e9-9e9e9e9e9e9e', $1, 'Corn Moonshine', 'alcohol', null),
      ('a1a1a1a1-a1a1-4a11-8a11-a1a1a1a1a1a1', $1, 'Berry Seltzer', 'alcohol', null)`,
    [VENDOR],
  );
  await db.exec(`
    insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug) values
      ('9b9b9b9b-9b9b-49b9-89b9-9b9b9b9b9b9b', 'kind.hard-cider'),
      ('9c9c9c9c-9c9c-49c9-89c9-9c9c9c9c9c9c', 'kind.gin'),
      ('9d9d9d9d-9d9d-49d9-89d9-9d9d9d9d9d9d', 'kind.wine');
  `);

  const pumpkin = await search(db, "pumpkin pie");
  assert.ok(pumpkin.some((row) => row.item_name === "Pumpkin pie" && row.product_category === "pies-and-sweets"));
  assert.equal(
    pumpkin.some((row) => row.product_category === "alcohol"),
    false,
  );
  assert.equal(
    pumpkin.some((row) => row.product_category === "pet-food"),
    false,
  );

  const muffin = await search(db, "blueberry muffin");
  assert.ok(muffin.some((row) => row.item_name === "Blueberry muffin" && row.product_category === "bread-and-bakery"));
  assert.equal(
    muffin.some((row) => row.item_name === "Blueberry Muffin" && row.product_category === "alcohol"),
    false,
  );

  const cider = await search(db, "cider");
  assert.ok(cider.some((row) => row.item_name === "Dry Cider" && row.product_category === "alcohol"));
  const gin = await search(db, "gin");
  assert.ok(gin.some((row) => row.item_name === "Dry Gin" && row.product_category === "alcohol"));
  const wine = await search(db, "wine");
  assert.ok(wine.some((row) => row.item_name === "House Wine" && row.product_category === "alcohol"));
  assert.ok(wine.some((row) => row.item_name === "Baco Noir" && row.product_category === "alcohol"));
  assert.equal(
    wine.some((row) => row.product_category === "pet-food"),
    false,
  );

  const moonshine = await search(db, "moonshine");
  assert.ok(moonshine.some((row) => row.item_name === "Corn Moonshine" && row.product_category === "alcohol"));
  const seltzer = await search(db, "seltzer");
  assert.ok(seltzer.some((row) => row.item_name === "Berry Seltzer" && row.product_category === "alcohol"));

  const cabernet = await search(db, "cabernet");
  assert.ok(cabernet.some((row) => row.item_name === "Cabernet Franc" && row.product_category === "alcohol"));
});

test("pet food, null-category names, rings, dumplings, and turkey still hold", async () => {
  const db = await database();
  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ('b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1', $1, 'Taro Milk Tea', null, null),
      ('b2b2b2b2-b2b2-41b2-81b2-b2b2b2b2b2b2', $1, 'Pork dumplings', null, null)`,
    [VENDOR],
  );

  const turkey = await search(db, "turkey");
  assert.ok(turkey.some((row) => row.item_name === "Heritage turkey"));
  assert.equal(
    turkey.some((row) => row.product_category === "pet-food"),
    false,
  );

  const rings = await search(db, "rings");
  assert.ok(rings.some((row) => row.item_name === "Silver band"));
  assert.equal(indexOf(rings, "Onion rings"), -1);

  const dumpling = await search(db, "dumpling");
  assert.ok(dumpling.some((row) => row.item_name === "Pork dumplings" && row.product_category == null));
  const dumplings = await search(db, "dumplings");
  assert.ok(dumplings.some((row) => row.item_name === "Pork dumplings" && row.product_category == null));

  const taro = await search(db, "Taro Milk Tea");
  assert.ok(taro.some((row) => row.item_name === "Taro Milk Tea" && row.product_category == null));

  const dogTreats = await search(db, "dog treats");
  assert.ok(dogTreats.some((row) => row.product_category === "pet-food"));
});

type SpreadRow = SearchRow & { vendor_name: string; vendor_slug: string };

function spreadId(n: number) {
  return `a1000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

async function searchPage(db: PGlite, q: string, lim: number, off: number) {
  const result = await db.query<SpreadRow>(
    "select item_name, product_category, vendor_name, vendor_slug from public.search_products($1, false, null, null, $2, $3)",
    [q, lim, off],
  );
  return result.rows;
}

test("one vendor cannot fill the top matches, and pages stay disjoint", async () => {
  const db = await database();
  const best = spreadId(1);
  const earth = spreadId(2);
  const gift = spreadId(3);
  const others = Array.from({ length: 12 }, (_, index) => spreadId(10 + index));

  await db.query(
    `insert into public.vendors (id, slug, name) values
      ($1, 'z-best', 'Z Best Soap'),
      ($2, 'earth-witch', 'Earth Witch Apothecary'),
      ($3, 'gift-stall', 'Gift Stall')`,
    [best, earth, gift],
  );
  for (const [index, vendorId] of others.entries()) {
    const label = String(index + 1).padStart(2, "0");
    await db.query("insert into public.vendors (id, slug, name) values ($1, $2, $3)", [
      vendorId,
      `vendor-${label}`,
      `Vendor ${label}`,
    ]);
  }

  const vendorIds = [best, earth, gift, ...others];
  for (const vendorId of vendorIds) {
    await db.query(
      "insert into public.market_vendors (market_id, vendor_id, days) values ($1, $2, '{6}')",
      [MARKET, vendorId],
    );
  }

  await db.query(
    `insert into public.vendor_menus (id, vendor_id, name, product_category, product_slug) values
      ($1, $2, 'Signature Bath Bomb', 'body-care', 'bath-bomb')`,
    [spreadId(100), best],
  );
  for (let index = 1; index <= 12; index += 1) {
    const label = String(index).padStart(2, "0");
    await db.query(
      "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, $3, 'body-care')",
      [spreadId(200 + index), earth, `Earth Bath Bomb ${label}`],
    );
  }
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Dog Bath Bomb', 'pet-food')",
    [spreadId(300), earth],
  );
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Baby Bath Bomb', 'baby')",
    [spreadId(301), earth],
  );
  await db.query(
    "insert into public.vendor_menus (id, vendor_id, name, product_category) values ($1, $2, 'Bath Bomb Gift Set', 'gifts-and-sets')",
    [spreadId(302), gift],
  );
  for (const [index, vendorId] of others.entries()) {
    const label = String(index + 1).padStart(2, "0");
    await db.query(
      `insert into public.vendor_menus (id, vendor_id, name, product_category) values
        ($1, $3, $4, 'body-care'),
        ($2, $3, $5, 'body-care')`,
      [
        spreadId(400 + index * 2),
        spreadId(401 + index * 2),
        vendorId,
        `Vendor ${label} Bath Bomb A`,
        `Vendor ${label} Bath Bomb B`,
      ],
    );
  }

  const top = await searchPage(db, "bath bomb", 24, 0);
  assert.equal(top[0]?.item_name, "Signature Bath Bomb");
  assert.equal(top[0]?.vendor_name, "Z Best Soap");
  const earthTop = top.filter((row) => row.vendor_slug === "earth-witch");
  assert.equal(earthTop.length, 2);
  assert.equal(
    top.some((row) => row.item_name === "Earth Bath Bomb 12"),
    false,
  );
  assert.equal(
    top.some((row) => row.item_name === "Vendor 12 Bath Bomb A"),
    true,
  );
  assert.equal(new Set(top.map((row) => row.vendor_slug)).size, 15);
  const perVendor = new Map<string, number>();
  for (const row of top) perVendor.set(row.vendor_slug, (perVendor.get(row.vendor_slug) ?? 0) + 1);
  for (const [slug, count] of perVendor) assert.ok(count <= 2, `${slug} has ${count} in the top 24`);

  const full = await searchPage(db, "bath bomb", 40, 0);
  assert.equal(full.length, 38);
  assert.equal(full.filter((row) => row.vendor_slug === "earth-witch").length, 12);
  assert.equal(
    full.some((row) => row.product_category === "pet-food"),
    false,
  );
  assert.equal(
    full.some((row) => row.product_category === "baby"),
    false,
  );
  assert.equal(
    full.find((row) => row.item_name === "Bath Bomb Gift Set")?.product_category,
    "gifts-and-sets",
  );

  const pages = await Promise.all([0, 10, 20, 30].map((off) => searchPage(db, "bath bomb", 10, off)));
  const flat = pages.flat();
  const key = (row: SpreadRow) => `${row.vendor_slug}\0${row.item_name}`;
  assert.deepEqual(flat.map(key), full.map(key));
  assert.equal(new Set(flat.map(key)).size, flat.length);
  assert.equal(pages[0]?.[0]?.item_name, "Signature Bath Bomb");
  assert.equal((await searchPage(db, "bath bomb", 10, 40)).length, 0);
});
