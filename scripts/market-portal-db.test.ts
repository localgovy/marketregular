import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const MARKET = "55555555-5555-4555-8555-555555555555";
const HOURS = "88888888-8888-4888-8888-888888888888";
const VENDOR = "44444444-4444-4444-8444-444444444444";

function extractFunction(relativePath: string, name: string) {
  const sql = readFileSync(join(root, relativePath), "utf8");
  const lowered = sql.toLowerCase();
  const signature = `function public.${name.toLowerCase()}`;
  const at = lowered.indexOf(signature);
  if (at < 0) throw new Error(`Missing ${name} in ${relativePath}`);
  const createAt = lowered.lastIndexOf("create or replace function", at);
  if (createAt < 0) throw new Error(`Missing create for ${name}`);
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

const portal = "supabase/migrations/20261005180000_market_portal.sql";
const fixes = "supabase/migrations/20261005211604_portal_account_editor_fixes.sql";

const schema = `
create schema if not exists auth;
create table auth.session (
  role text not null,
  uid uuid,
  claims jsonb not null default '{}'::jsonb
);
insert into auth.session (role, uid) values ('anon', null);
create function auth.role()
returns text language sql stable as $$ select role from auth.session $$;
create function auth.uid()
returns uuid language sql stable as $$ select uid from auth.session $$;
create function auth.jwt()
returns jsonb language sql stable as $$ select claims from auth.session $$;
create table auth.users (
  id uuid primary key,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);

create type public.listing_status as enum ('draft', 'published');
create type public.user_role as enum ('user', 'vendor', 'admin');

create table public.profiles (
  id uuid primary key,
  role public.user_role not null default 'user'
);
create table public.markets (
  id uuid primary key,
  slug text not null,
  name text not null,
  about text,
  address text not null default '',
  city text not null default '',
  province text not null default 'ON',
  postal_code text,
  lat double precision,
  lng double precision,
  geofence_radius_m integer not null default 250,
  website text,
  instagram text,
  tiktok text,
  facebook text,
  phone text,
  email text,
  logo_url text,
  tags text[] not null default '{}',
  status public.listing_status not null default 'draft',
  featured boolean not null default false,
  review_count integer not null default 0,
  rating_avg numeric(3, 2),
  claimed_by uuid references public.profiles (id)
);
create table public.market_schedules (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets (id),
  weekday smallint not null,
  opens_at time not null,
  closes_at time not null,
  season_start text,
  season_end text,
  notes text,
  research_notes text
);
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  about text,
  website text,
  instagram text,
  tiktok text,
  facebook text,
  phone text,
  email text,
  logo_url text,
  tags text[] not null default '{}',
  status public.listing_status not null default 'draft',
  claimed_by uuid references public.profiles (id),
  review_count integer not null default 0,
  rating_avg numeric(3, 2),
  selling_approved boolean not null default false,
  created_by_market_id uuid references public.markets (id)
);
create table public.market_vendors (
  market_id uuid not null references public.markets (id),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  stall text,
  days smallint[] not null default '{}',
  primary key (market_id, vendor_id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict
);
create type public.claim_status as enum ('pending', 'approved', 'rejected');
create type public.claim_target as enum ('market', 'vendor');
create table public.portal_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind public.claim_target not null,
  requested_target_id uuid,
  status public.claim_status not null default 'pending'
);
create table public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  target_type public.claim_target not null,
  target_id uuid not null,
  status public.claim_status not null default 'pending'
);

${extractFunction(fixes, "password_change_pending")}
${extractFunction(fixes, "portal_season_day_ok")}
${extractFunction("supabase/migrations/20261002183516_vendor_portal.sql", "portal_tags")}
${extractFunction("supabase/migrations/20260829235108_security_scan_lockdown.sql", "listing_href_ok")}
${extractFunction("supabase/migrations/20260829235108_security_scan_lockdown.sql", "guard_listing_hrefs")}
${extractFunction("supabase/migrations/20260825022654_public_release_security.sql", "protect_market_privilege_columns")}
${extractFunction(portal, "protect_vendor_privilege_columns")}
${extractFunction(portal, "owns_market")}
${extractFunction(portal, "portal_phone")}
${extractFunction(portal, "portal_email")}
${extractFunction(portal, "portal_open_days")}
${extractFunction(fixes, "portal_vendor_slug")}
${extractFunction(portal, "my_market_portal")}
${extractFunction(portal, "save_owned_market")}
${extractFunction(fixes, "save_owned_schedule")}
${extractFunction(portal, "delete_owned_schedule")}
${extractFunction(portal, "save_market_roster")}
${extractFunction(fixes, "delete_market_roster")}
${extractFunction(fixes, "create_market_vendor")}
${extractFunction(fixes, "save_market_vendor_profile")}
${extractFunction("supabase/migrations/20261003180410_security_checkout_and_password_lockdown.sql", "owns_vendor")}
${extractFunction(fixes, "save_owned_stall")}

create trigger guard_listing_hrefs
  before insert or update on public.markets
  for each row execute function public.guard_listing_hrefs();
create trigger guard_vendor_hrefs
  before insert or update on public.vendors
  for each row execute function public.guard_listing_hrefs();
create trigger protect_market_privilege_columns
  before update on public.markets
  for each row execute function public.protect_market_privilege_columns();
create trigger protect_vendor_privilege_columns
  before update on public.vendors
  for each row execute function public.protect_vendor_privilege_columns();
`;

async function database() {
  const db = new PGlite();
  await db.exec(schema);
  return db;
}

async function setAuth(db: PGlite, role: string, uid: string | null, claims: Record<string, unknown> = {}) {
  await db.query("update auth.session set role = $1, uid = $2, claims = $3::jsonb", [
    role,
    uid,
    JSON.stringify(claims),
  ]);
  if (!uid) return;
  const meta =
    claims.app_metadata && typeof claims.app_metadata === "object" ? claims.app_metadata : {};
  await db.query(
    `insert into auth.users (id, raw_app_meta_data) values ($1, $2::jsonb)
     on conflict (id) do update set raw_app_meta_data = excluded.raw_app_meta_data`,
    [uid, JSON.stringify(meta)],
  );
}

async function seed(db: PGlite) {
  await db.query("insert into public.profiles (id, role) values ($1, 'user'), ($2, 'user')", [OWNER, OTHER]);
  await db.query(
    `insert into public.markets (
      id, slug, name, about, address, city, province, postal_code, lat, lng, status, claimed_by
    ) values ($1, 'withrow', 'Withrow', 'Park', '725 Logan Ave', 'Toronto', 'ON', 'M4J 1M3', 43.67, -79.33, 'published', $2)`,
    [MARKET, OWNER],
  );
  await db.query(
    `insert into public.market_schedules (id, market_id, weekday, opens_at, closes_at, research_notes)
     values ($1, $2, 6, '08:00', '14:00', 'admin only')`,
    [HOURS, MARKET],
  );
  await db.query(
    "insert into public.vendors (id, slug, name, status, phone) values ($1, 'river-fruit', 'River Fruit', 'published', '416-555-0100')",
    [VENDOR],
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

async function marketRow(db: PGlite) {
  const result = await db.query<{
    name: string;
    slug: string;
    lat: number;
    status: string;
    claimed_by: string;
    address: string;
  }>("select name, slug, lat, status::text as status, claimed_by::text as claimed_by, address from public.markets where id = $1", [
    MARKET,
  ]);
  return result.rows[0];
}

test("another person cannot edit the market, and privilege columns stay put", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OTHER);
  const blocked = await expectRaise(() =>
    db.query(
      `select public.save_owned_market($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text[])`,
      [MARKET, "Taken", null, "1 Main", "Toronto", "ON", null, null, null, null, null, null, null, []],
    ),
  );
  assert.equal(blocked.code, "42501");
  assert.equal((await marketRow(db))?.name, "Withrow");

  await setAuth(db, "authenticated", OWNER);
  await db.query(
    `select public.save_owned_market($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::text[])`,
    [
      MARKET,
      "  Withrow Park  ",
      " Saturday market ",
      " 725 Logan Ave ",
      " Toronto ",
      "on",
      " m4j 1m3 ",
      "https://example.com",
      "",
      "",
      "",
      " 416-555-0140 ",
      "Market@Example.com",
      ["Produce"],
    ],
  );
  const saved = await db.query<{
    name: string;
    about: string;
    province: string;
    postal_code: string;
    email: string;
    tags: string[];
    slug: string;
    lat: number;
    status: string;
    claimed_by: string;
  }>(
    `select name, about, province, postal_code, email, tags, slug, lat, status::text as status, claimed_by::text as claimed_by
     from public.markets where id = $1`,
    [MARKET],
  );
  const row = saved.rows[0];
  assert.equal(row?.name, "Withrow Park");
  assert.equal(row?.about, "Saturday market");
  assert.equal(row?.province, "ON");
  assert.equal(row?.postal_code, "M4J 1M3");
  assert.equal(row?.email, "market@example.com");
  assert.deepEqual(row?.tags, ["produce"]);
  assert.equal(row?.slug, "withrow");
  assert.equal(Number(row?.lat), 43.67);
  assert.equal(row?.status, "published");
  assert.equal(row?.claimed_by, OWNER);

  const privilege = await expectRaise(() =>
    db.query("update public.markets set slug = 'stolen', lat = 1 where id = $1", [MARKET]),
  );
  assert.equal(privilege.code, "42501");
  assert.equal((await marketRow(db))?.slug, "withrow");
});

test("hours reject a close before open, and a roster day the market is closed", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  const backwards = await expectRaise(() =>
    db.query(
      "select public.save_owned_schedule($1, null::uuid, 6::smallint, '14:00', '08:00', '', '', '')",
      [MARKET],
    ),
  );
  assert.match(backwards.message, /Open has to be before close/);
  const count = await db.query<{ n: number }>("select count(*)::int as n from public.market_schedules");
  assert.equal(count.rows[0]?.n, 1);

  const sunday = await expectRaise(() =>
    db.query("select public.save_market_roster($1, $2, 'A', $3::smallint[])", [MARKET, VENDOR, [0]]),
  );
  assert.match(sunday.message, /Pick days the market is open/);

  await db.query("select public.save_market_roster($1, $2, 'Row A', $3::smallint[])", [MARKET, VENDOR, [6]]);
  const linked = await db.query<{ stall: string; days: number[] }>(
    "select stall, days from public.market_vendors where market_id = $1 and vendor_id = $2",
    [MARKET, VENDOR],
  );
  assert.equal(linked.rows[0]?.stall, "Row A");
  assert.deepEqual(linked.rows[0]?.days, [6]);

  const removed = await expectRaise(() =>
    db.query("select public.delete_owned_schedule($1, $2)", [MARKET, HOURS]),
  );
  assert.match(removed.message, /A stall is still set for that day/);
  const notes = await db.query<{ research_notes: string }>(
    "select research_notes from public.market_schedules where id = $1",
    [HOURS],
  );
  assert.equal(notes.rows[0]?.research_notes, "admin only");
});

test("a market-made stall stays without an owner until a vendor account is assigned", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  const created = await db.query<{ id: string }>(
    `select public.create_market_vendor(
      $1, '  Peach Stand  ', ' Peaches ', '', '', '', '', '416-555-0160', 'Peach@Example.com', $2::text[], 'B', $3::smallint[]
    ) as id`,
    [MARKET, ["produce"], [6]],
  );
  const id = created.rows[0]?.id;
  assert.ok(id);
  const stall = await db.query<{
    slug: string;
    name: string;
    status: string;
    claimed_by: string | null;
    selling_approved: boolean;
    created_by_market_id: string;
    email: string;
  }>(
    `select slug, name, status::text as status, claimed_by::text as claimed_by, selling_approved,
            created_by_market_id::text as created_by_market_id, email
     from public.vendors where id = $1`,
    [id],
  );
  assert.equal(stall.rows[0]?.slug, "peach-stand");
  assert.equal(stall.rows[0]?.name, "Peach Stand");
  assert.equal(stall.rows[0]?.status, "published");
  assert.equal(stall.rows[0]?.claimed_by, null);
  assert.equal(stall.rows[0]?.selling_approved, false);
  assert.equal(stall.rows[0]?.created_by_market_id, MARKET);
  assert.equal(stall.rows[0]?.email, "peach@example.com");

  const duplicate = await expectRaise(() =>
    db.query(
      `select public.create_market_vendor($1, 'Peach Stand', '', '', '', '', '', '', '', '{}'::text[], '', $2::smallint[])`,
      [MARKET, [6]],
    ),
  );
  assert.match(duplicate.message, /already listed/);

  const listed = await expectRaise(() =>
    db.query(
      `select public.create_market_vendor($1, 'River Fruit', '', '', '', '', '', '', '', '{}'::text[], '', $2::smallint[])`,
      [MARKET, [6]],
    ),
  );
  assert.match(listed.message, /already listed/);

  await db.query(
    `select public.save_market_vendor_profile($1,$2,'Peach Stand Co','Jam','','','','','','','{}'::text[])`,
    [MARKET, id],
  );
  const renamed = await db.query<{ name: string; slug: string }>(
    "select name, slug from public.vendors where id = $1",
    [id],
  );
  assert.equal(renamed.rows[0]?.name, "Peach Stand Co");
  assert.equal(renamed.rows[0]?.slug, "peach-stand");

  await setAuth(db, "service_role", null);
  await db.query("update public.vendors set claimed_by = $1 where id = $2", [OTHER, id]);
  await setAuth(db, "authenticated", OWNER);
  const locked = await expectRaise(() =>
    db.query(
      `select public.save_market_vendor_profile($1,$2,'Stolen','','','','','','','','{}'::text[])`,
      [MARKET, id],
    ),
  );
  assert.match(locked.message, /not yours to edit/);
  await db.query("select public.save_market_roster($1, $2, 'Row C', $3::smallint[])", [MARKET, id, [6]]);
  const days = await db.query<{ stall: string }>(
    "select stall from public.market_vendors where vendor_id = $1",
    [id],
  );
  assert.equal(days.rows[0]?.stall, "Row C");

  const portal = await db.query<{ portal: unknown }>("select public.my_market_portal() as portal");
  const parsed = typeof portal.rows[0]?.portal === "string" ? JSON.parse(portal.rows[0].portal) : portal.rows[0]?.portal;
  const peach = (parsed as { stalls: { vendor_name: string; phone?: string; editable: boolean }[] }[])[0]?.stalls.find(
    (row) => row.vendor_name === "Peach Stand Co",
  );
  assert.equal(peach?.editable, false);
  assert.equal(peach && "phone" in peach, false);
});

test("removing an unclaimed stall deletes it, and an order or a claim keeps the listing", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  const created = await db.query<{ id: string }>(
    `select public.create_market_vendor($1, 'Jam Jar', '', '', '', '', '', '', '', '{}'::text[], '', $2::smallint[]) as id`,
    [MARKET, [6]],
  );
  const id = created.rows[0]!.id;
  await db.query("select public.delete_market_roster($1, $2)", [MARKET, id]);
  const gone = await db.query("select id from public.vendors where id = $1", [id]);
  assert.equal(gone.rows.length, 0);

  const kept = await db.query<{ id: string }>(
    `select public.create_market_vendor($1, 'Ordered Honey', '', '', '', '', '', '', '', '{}'::text[], '', $2::smallint[]) as id`,
    [MARKET, [6]],
  );
  const honey = kept.rows[0]!.id;
  await db.query("insert into public.orders (vendor_id) values ($1)", [honey]);
  await db.query("select public.delete_market_roster($1, $2)", [MARKET, honey]);
  const still = await db.query("select id from public.vendors where id = $1", [honey]);
  assert.equal(still.rows.length, 1);
  const unlinked = await db.query("select vendor_id from public.market_vendors where vendor_id = $1", [honey]);
  assert.equal(unlinked.rows.length, 0);

  await db.query("select public.save_market_roster($1, $2, 'A', $3::smallint[])", [MARKET, VENDOR, [6]]);
  await db.query("select public.delete_market_roster($1, $2)", [MARKET, VENDOR]);
  const directory = await db.query("select id from public.vendors where id = $1", [VENDOR]);
  assert.equal(directory.rows.length, 1);
});

test("the create cap and a pending password block the editor", async () => {
  const db = await database();
  await seed(db);
  await db.query(
    `insert into public.vendors (slug, name, status, created_by_market_id)
     select 'made-' || g, 'Made ' || g, 'published', $1
     from generate_series(1, 80) g`,
    [MARKET],
  );
  await setAuth(db, "authenticated", OWNER);
  const full = await expectRaise(() =>
    db.query(
      `select public.create_market_vendor($1, 'One More', '', '', '', '', '', '', '', '{}'::text[], '', $2::smallint[])`,
      [MARKET, [6]],
    ),
  );
  assert.match(full.message, /cannot add more stalls/);

  await setAuth(db, "authenticated", OWNER, { app_metadata: { must_set_password: true } });
  const owns = await db.query<{ owns: boolean }>("select public.owns_market($1) as owns", [MARKET]);
  assert.equal(owns.rows[0]?.owns, false);
  const pending = await expectRaise(() =>
    db.query(
      `select public.save_owned_market($1,'Withrow',null,'725 Logan Ave','Toronto','ON',null,null,null,null,null,null,null,'{}'::text[])`,
      [MARKET],
    ),
  );
  assert.equal(pending.code, "42501");
  assert.equal((await marketRow(db))?.name, "Withrow");
});

test("duplicate hours, impossible seasons, and a cut slug are refused", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  const duplicate = await expectRaise(() =>
    db.query(
      "select public.save_owned_schedule($1, null, 6, '08:00', '14:00', '', '', '')",
      [MARKET],
    ),
  );
  assert.match(duplicate.message, /already listed/);
  const season = await expectRaise(() =>
    db.query(
      "select public.save_owned_schedule($1, null, 0, '09:00', '12:00', '02-31', '03-01', '')",
      [MARKET],
    ),
  );
  assert.match(season.message, /season is not allowed/);
  const slug = await db.query<{ slug: string }>(
    "select public.portal_vendor_slug($1) as slug",
    ["a".repeat(71) + " extra"],
  );
  assert.match(slug.rows[0]?.slug ?? "", /^a+$/);
});

test("a draft hall can be updated, and a pending request keeps the listing", async () => {
  const db = await database();
  await seed(db);
  await db.query("update public.markets set status = 'draft' where id = $1", [MARKET]);
  await db.query("update public.vendors set claimed_by = $1 where id = $2", [OWNER, VENDOR]);
  await db.query(
    "insert into public.market_vendors (market_id, vendor_id, days) values ($1, $2, '{6}'::smallint[])",
    [MARKET, VENDOR],
  );
  await setAuth(db, "authenticated", OWNER);
  await db.query("select public.save_owned_stall($1, $2, 'Row A', '{6}'::smallint[])", [VENDOR, MARKET]);
  const stall = await db.query<{ stall: string }>(
    "select stall from public.market_vendors where vendor_id = $1",
    [VENDOR],
  );
  assert.equal(stall.rows[0]?.stall, "Row A");

  await db.query("update public.markets set status = 'published' where id = $1", [MARKET]);
  const created = await db.query<{ id: string }>(
    `select public.create_market_vendor($1, 'Jam Jar', '', '', '', '', '', '', '', '{}'::text[], '', '{6}'::smallint[]) as id`,
    [MARKET],
  );
  const id = created.rows[0]!.id;
  await db.query(
    "insert into public.portal_applications (user_id, kind, requested_target_id) values ($1, 'vendor', $2)",
    [OTHER, id],
  );
  const removed = await db.query<{ result: string }>(
    "select public.delete_market_roster($1, $2) as result",
    [MARKET, id],
  );
  assert.equal(removed.rows[0]?.result, "kept:request");
  const still = await db.query("select id from public.vendors where id = $1", [id]);
  assert.equal(still.rows.length, 1);
});
