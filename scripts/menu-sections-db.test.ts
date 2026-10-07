import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = "supabase/migrations/20261007200000_vendor_menu_sections.sql";
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const VENDOR = "44444444-4444-4444-8444-444444444444";

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

const schema = `
create schema if not exists auth;
create table auth.session (
  role text not null,
  uid uuid
);
insert into auth.session (role, uid) values ('anon', null);
create function auth.role()
returns text language sql stable as $$ select role from auth.session $$;
create function auth.uid()
returns uuid language sql stable as $$ select uid from auth.session $$;

create table public.profiles (
  id uuid primary key
);
create table public.vendors (
  id uuid primary key,
  slug text not null,
  name text not null,
  status text not null default 'published',
  claimed_by uuid
);
create table public.vendor_menus (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id),
  name text not null,
  description text,
  price_cents integer,
  season text,
  dietary text[] not null default '{}',
  for_sale boolean not null default false,
  offer_delivery boolean not null default false,
  offer_pickup boolean not null default false,
  offer_preorder boolean not null default false,
  offer_terms text,
  menu_section text,
  menu_section_order smallint,
  constraint vendor_menus_menu_section_len
    check (menu_section is null or (char_length(btrim(menu_section)) between 1 and 40)),
  constraint vendor_menus_menu_section_order_range
    check (menu_section_order is null or menu_section_order between 1 and 5)
);

${extractFunction("supabase/migrations/20260825022654_public_release_security.sql", "owns_vendor")}
${extractFunction("supabase/migrations/20261002183516_vendor_portal.sql", "portal_tags")}
${extractFunction(migration, "vendor_menus_section_cap")}
${extractFunction(migration, "vendor_menus_section_cap_stmt")}
${extractFunction(migration, "save_owned_menu_item")}
${extractFunction(migration, "set_menu_sections")}
${extractFunction(migration, "set_owned_menu_sections")}

create trigger vendor_menus_section_cap
  before insert or update of menu_section, menu_section_order, vendor_id
  on public.vendor_menus
  for each row
  execute function public.vendor_menus_section_cap();

create trigger vendor_menus_section_cap_stmt
  after insert or update of menu_section, menu_section_order, vendor_id
  on public.vendor_menus
  for each statement
  execute function public.vendor_menus_section_cap_stmt();
`;

async function database() {
  const db = new PGlite();
  await db.exec(schema);
  return db;
}

async function setAuth(db: PGlite, role: string, uid: string | null) {
  await db.query("update auth.session set role = $1, uid = $2", [role, uid]);
}

async function seed(db: PGlite) {
  await db.query("insert into public.profiles (id) values ($1), ($2)", [OWNER, OTHER]);
  await db.query(
    "insert into public.vendors (id, slug, name, claimed_by) values ($1, 'river-fruit', 'River Fruit', $2)",
    [VENDOR, OWNER],
  );
}

async function expectRaise(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const raised = error as { code?: string; message?: string };
    return { code: raised.code ?? "", message: raised.message ?? String(error) };
  }
  assert.fail("expected the database to reject that call");
}

test("empty section names become null", async () => {
  const db = await database();
  await seed(db);
  await db.query(
    "insert into public.vendor_menus (vendor_id, name, menu_section) values ($1, 'Peaches', '   ')",
    [VENDOR],
  );
  const row = await db.query<{ menu_section: string | null }>(
    "select menu_section from public.vendor_menus",
  );
  assert.equal(row.rows[0]?.menu_section, null);
});

test("a vendor cannot store a sixth named section", async () => {
  const db = await database();
  await seed(db);
  for (let i = 1; i <= 5; i += 1) {
    await db.query(
      "insert into public.vendor_menus (vendor_id, name, menu_section, menu_section_order) values ($1, $2, $3, $4)",
      [VENDOR, `Item ${i}`, `Section ${i}`, i],
    );
  }
  const raised = await expectRaise(() =>
    db.query(
      "insert into public.vendor_menus (vendor_id, name, menu_section, menu_section_order) values ($1, 'Extra', 'Sixth', 5)",
      [VENDOR],
    ),
  );
  assert.match(raised.message, /at most 5 sections/);
});

test("a single statement can fill up to five sections from null", async () => {
  const db = await database();
  await seed(db);
  const ids: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const inserted = await db.query<{ id: string }>(
      "insert into public.vendor_menus (vendor_id, name) values ($1, $2) returning id::text as id",
      [VENDOR, `Item ${i}`],
    );
    ids.push(inserted.rows[0]!.id);
  }
  await db.query(
    `update public.vendor_menus m
     set menu_section = v.section, menu_section_order = v.ord
     from (values
       ($1::uuid, 'Breads', 1::smallint),
       ($2::uuid, 'Breads', 1::smallint),
       ($3::uuid, 'Pastries', 2::smallint),
       ($4::uuid, 'Pastries', 2::smallint),
       ($5::uuid, 'Cakes', 3::smallint),
       ($6::uuid, 'Cakes', 3::smallint),
       ($7::uuid, 'Cookies', 4::smallint),
       ($8::uuid, 'Cookies', 4::smallint),
       ($9::uuid, 'Drinks', 5::smallint),
       ($10::uuid, 'Drinks', 5::smallint)
     ) as v(id, section, ord)
     where m.id = v.id`,
    ids,
  );
  const count = await db.query<{ n: number }>(
    "select count(distinct menu_section)::int as n from public.vendor_menus where vendor_id = $1",
    [VENDOR],
  );
  assert.equal(count.rows[0]?.n, 5);
});

test("a single statement cannot fill a sixth section", async () => {
  const db = await database();
  await seed(db);
  const ids: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const inserted = await db.query<{ id: string }>(
      "insert into public.vendor_menus (vendor_id, name) values ($1, $2) returning id::text as id",
      [VENDOR, `Item ${i}`],
    );
    ids.push(inserted.rows[0]!.id);
  }
  const raised = await expectRaise(() =>
    db.query(
      `update public.vendor_menus m
       set menu_section = v.section, menu_section_order = v.ord
       from (values
         ($1::uuid, 'One', 1::smallint),
         ($2::uuid, 'Two', 2::smallint),
         ($3::uuid, 'Three', 3::smallint),
         ($4::uuid, 'Four', 4::smallint),
         ($5::uuid, 'Five', 5::smallint),
         ($6::uuid, 'Six', 5::smallint)
       ) as v(id, section, ord)
       where m.id = v.id`,
      ids,
    ),
  );
  assert.match(raised.message, /at most 5 sections/);
  const count = await db.query<{ n: number }>(
    "select count(distinct menu_section)::int as n from public.vendor_menus where vendor_id = $1 and menu_section is not null",
    [VENDOR],
  );
  assert.equal(count.rows[0]?.n, 0);
});

test("owners can save a section and rename the set", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  await db.query(
    `select public.save_owned_menu_item($1, null, 'Rye', null, 800, null, '{}'::text[], false, false, false, false, null, 'Breads', 1)`,
    [VENDOR],
  );
  await db.query(
    `select public.save_owned_menu_item($1, null, 'Tart', null, 500, null, '{}'::text[], false, false, false, false, null, 'Sweets', 2)`,
    [VENDOR],
  );
  await db.query(
    `select public.set_owned_menu_sections($1, $2::jsonb)`,
    [
      VENDOR,
      JSON.stringify([
        { from: "Breads", name: "Loaves", order: 1 },
        { from: "Sweets", name: "Sweets", order: 2 },
      ]),
    ],
  );
  const rows = await db.query<{ name: string; menu_section: string }>(
    "select name, menu_section from public.vendor_menus order by name",
  );
  assert.deepEqual(
    rows.rows.map((row) => [row.name, row.menu_section]),
    [
      ["Rye", "Loaves"],
      ["Tart", "Sweets"],
    ],
  );
});

test("renaming five sections in one call stays under the cap", async () => {
  const db = await database();
  await seed(db);
  for (let i = 1; i <= 5; i += 1) {
    await db.query(
      "insert into public.vendor_menus (vendor_id, name, menu_section, menu_section_order) values ($1, $2, $3, $4)",
      [VENDOR, `Item ${i}`, `Section ${i}`, i],
    );
  }
  await db.query(`select public.set_menu_sections($1, $2::jsonb)`, [
    VENDOR,
    JSON.stringify(
      [1, 2, 3, 4, 5].map((i) => ({
        from: `Section ${i}`,
        name: `Group ${i}`,
        order: i,
      })),
    ),
  ]);
  const names = await db.query<{ menu_section: string }>(
    "select distinct menu_section from public.vendor_menus order by menu_section",
  );
  assert.deepEqual(
    names.rows.map((row) => row.menu_section),
    ["Group 1", "Group 2", "Group 3", "Group 4", "Group 5"],
  );
});

test("another account cannot rewrite sections", async () => {
  const db = await database();
  await seed(db);
  await db.query(
    "insert into public.vendor_menus (vendor_id, name, menu_section, menu_section_order) values ($1, 'Rye', 'Breads', 1)",
    [VENDOR],
  );
  await setAuth(db, "authenticated", OTHER);
  const raised = await expectRaise(() =>
    db.query(`select public.set_owned_menu_sections($1, $2::jsonb)`, [
      VENDOR,
      JSON.stringify([{ from: "Breads", name: "Loaves", order: 1 }]),
    ]),
  );
  assert.equal(raised.code, "42501");
});
