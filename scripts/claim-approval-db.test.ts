import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const VENDOR = "44444444-4444-4444-8444-444444444444";
const MARKET = "55555555-5555-4555-8555-555555555555";
const CLAIM = "66666666-6666-4666-8666-666666666666";
const CLAIM2 = "77777777-7777-4777-8777-777777777777";

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
  const statement = sql.slice(createAt, end + 1);
  if (!statement.toLowerCase().includes(name.toLowerCase())) {
    throw new Error(`Extracted statement is not ${name}`);
  }
  return statement;
}

const decideClaimSql = extractFunction(
  "supabase/migrations/20260923205740_directory_read_and_advisors.sql",
  "decide_claim",
);
const schema = `
create schema if not exists auth;
create table auth.session (
  role text not null,
  uid uuid
);
insert into auth.session (role, uid) values ('anon', null);
create function auth.role()
returns text
language sql
stable
as $$ select role from auth.session $$;
create function auth.uid()
returns uuid
language sql
stable
as $$ select uid from auth.session $$;

create type public.user_role as enum ('user', 'vendor', 'admin');
create type public.listing_status as enum ('draft', 'published');
create type public.claim_status as enum ('pending', 'approved', 'rejected');
create type public.claim_target as enum ('market', 'vendor');

create table public.profiles (
  id uuid primary key,
  role public.user_role not null default 'user'
);
create table public.markets (
  id uuid primary key,
  slug text not null,
  name text not null,
  city text not null default '',
  claimed_by uuid references public.profiles (id)
);
create table public.market_schedules (
  id uuid primary key,
  market_id uuid not null references public.markets (id),
  weekday smallint not null,
  opens_at time not null,
  closes_at time not null
);
create table public.vendors (
  id uuid primary key,
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
  selling_approved boolean not null default false
);
create table public.market_vendors (
  market_id uuid not null references public.markets (id),
  vendor_id uuid not null references public.vendors (id),
  stall text,
  days smallint[] not null default '{}',
  primary key (market_id, vendor_id)
);
create table public.vendor_menus (
  id uuid primary key,
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
  offer_terms text
);
create table public.vendor_stripe_accounts (
  vendor_id uuid primary key references public.vendors (id),
  card_payments_active boolean not null default false,
  payouts_active boolean not null default false
);
create table public.orders (
  id uuid primary key,
  vendor_id uuid not null references public.vendors (id),
  item_name text not null,
  quantity integer not null,
  charge_cents integer not null,
  fulfillment text not null,
  status text not null,
  fulfillment_note text,
  delivery_name text,
  delivery_line1 text,
  delivery_city text,
  delivery_region text,
  delivery_postal text,
  buyer_email text,
  paid_at timestamptz
);
create table public.platform_fees (
  id uuid primary key,
  vendor_id uuid not null references public.vendors (id),
  percent_cents integer not null,
  flat_cents integer not null,
  voided boolean not null default false,
  earned_on date not null,
  created_at timestamptz not null default now()
);
create table public.platform_fee_payments (
  id uuid primary key,
  vendor_id uuid not null references public.vendors (id),
  amount_cents integer not null
);
create table public.claim_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles (id),
  target_type public.claim_target not null,
  target_id uuid not null,
  evidence text not null,
  status public.claim_status not null default 'pending',
  admin_note text
);

${extractFunction("supabase/migrations/20261002183516_vendor_portal.sql", "portal_tags")}
${extractFunction("supabase/migrations/20260825022654_public_release_security.sql", "owns_vendor")}
${extractFunction("supabase/migrations/20261002183516_vendor_portal.sql", "save_owned_vendor")}
${extractFunction("supabase/migrations/20260829235108_security_scan_lockdown.sql", "listing_href_ok")}
${extractFunction("supabase/migrations/20260829235108_security_scan_lockdown.sql", "guard_listing_hrefs")}
${decideClaimSql}
${extractFunction("supabase/migrations/20261002195358_stall_checkout.sql", "protect_vendor_privilege_columns")}
${extractFunction("supabase/migrations/20261002232211_buyer_order_email.sql", "my_vendor_portal")}

create trigger guard_listing_hrefs
  before insert or update on public.vendors
  for each row
  execute function public.guard_listing_hrefs();

create trigger protect_vendor_privilege_columns
  before update on public.vendors
  for each row
  execute function public.protect_vendor_privilege_columns();
`;

async function database() {
  const db = new PGlite();
  await db.exec(schema);
  return db;
}

async function setAuth(db: PGlite, role: string, uid: string | null) {
  await db.query("update auth.session set role = $1, uid = $2", [role, uid]);
}

async function seedDirectory(db: PGlite, ownerRole: "user" | "admin" = "user") {
  await db.query(
    "insert into public.profiles (id, role) values ($1, $2::public.user_role), ($3, 'user')",
    [OWNER, ownerRole, OTHER],
  );
  await db.query(
    "insert into public.vendors (id, slug, name, status) values ($1, 'river-fruit', 'River Fruit', 'published')",
    [VENDOR],
  );
  await db.query(
    "insert into public.markets (id, slug, name, city) values ($1, 'withrow', 'Withrow', 'Toronto')",
    [MARKET],
  );
}

async function seedVendorClaim(db: PGlite, id: string, userId: string) {
  await db.query(
    `insert into public.claim_requests (id, user_id, target_type, target_id, evidence)
     values ($1, $2, 'vendor', $3, 'I run this stall')`,
    [id, userId, VENDOR],
  );
}

async function roleOf(db: PGlite, id: string) {
  const result = await db.query<{ role: string }>("select role::text as role from public.profiles where id = $1", [id]);
  return result.rows[0]?.role;
}

async function vendorOwner(db: PGlite) {
  const result = await db.query<{ claimed_by: string | null }>(
    "select claimed_by::text as claimed_by from public.vendors where id = $1",
    [VENDOR],
  );
  return result.rows[0]?.claimed_by ?? null;
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

function portalRows(value: unknown) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  assert.ok(Array.isArray(parsed));
  return parsed as { id: string; name: string }[];
}

test("the claim function loaded from the migration grants the stall", () => {
  assert.match(decideClaimSql, /claimed_by = claim\.user_id/);
  assert.match(decideClaimSql, /role is distinct from 'admin'/);
});

test("a non-service role cannot decide a claim", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "authenticated", OWNER);
  const raised = await expectRaise(() => db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]));
  assert.equal(raised.code, "42501");
  assert.match(raised.message, /not allowed/);
  assert.equal(await vendorOwner(db), null);
  assert.equal(await roleOf(db, OWNER), "user");
  const claim = await db.query<{ status: string }>(
    "select status::text as status from public.claim_requests where id = $1",
    [CLAIM],
  );
  assert.equal(claim.rows[0]?.status, "pending");
});

test("vendor approval sets the owner and the vendor role", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);
  assert.equal(await vendorOwner(db), OWNER);
  assert.equal(await roleOf(db, OWNER), "vendor");
  const claim = await db.query<{ status: string }>(
    "select status::text as status from public.claim_requests where id = $1",
    [CLAIM],
  );
  assert.equal(claim.rows[0]?.status, "approved");
});

test("an admin claimant keeps the admin role and still owns the stall", async () => {
  const db = await database();
  await seedDirectory(db, "admin");
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);
  assert.equal(await vendorOwner(db), OWNER);
  assert.equal(await roleOf(db, OWNER), "admin");
});

test("a second person cannot take a stall that was just approved", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);
  await seedVendorClaim(db, CLAIM2, OTHER);
  const raised = await expectRaise(() => db.query("select public.decide_claim($1, 'approved', null)", [CLAIM2]));
  assert.match(raised.message, /already claimed/);
  assert.equal(await vendorOwner(db), OWNER);
  assert.equal(await roleOf(db, OTHER), "user");
  assert.equal(await roleOf(db, OWNER), "vendor");
});

test("reject leaves the stall unclaimed and the role unchanged", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'rejected', $2)", [CLAIM, "Not enough evidence"]);
  assert.equal(await vendorOwner(db), null);
  assert.equal(await roleOf(db, OWNER), "user");
  const claim = await db.query<{ status: string; admin_note: string | null }>(
    "select status::text as status, admin_note from public.claim_requests where id = $1",
    [CLAIM],
  );
  assert.equal(claim.rows[0]?.status, "rejected");
  assert.equal(claim.rows[0]?.admin_note, "Not enough evidence");
});

test("market approval claims the market and leaves the stall alone", async () => {
  const db = await database();
  await seedDirectory(db);
  await db.query(
    `insert into public.claim_requests (id, user_id, target_type, target_id, evidence)
     values ($1, $2, 'market', $3, 'I run this market')`,
    [CLAIM, OWNER, MARKET],
  );
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);
  const market = await db.query<{ claimed_by: string | null }>(
    "select claimed_by::text as claimed_by from public.markets where id = $1",
    [MARKET],
  );
  assert.equal(market.rows[0]?.claimed_by, OWNER);
  assert.equal(await vendorOwner(db), null);
});

test("only the approved owner can see and edit the stall", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);

  await setAuth(db, "authenticated", OWNER);
  const owns = await db.query<{ owns: boolean }>("select public.owns_vendor($1) as owns", [VENDOR]);
  assert.equal(owns.rows[0]?.owns, true);
  const portal = await db.query<{ portal: unknown }>("select public.my_vendor_portal() as portal");
  const listings = portalRows(portal.rows[0]?.portal);
  assert.equal(listings.length, 1);
  assert.equal(listings[0]?.id, VENDOR);
  assert.equal(listings[0]?.name, "River Fruit");

  await db.query(
    `select public.save_owned_vendor($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[])`,
    [
      VENDOR,
      "River Fruit Co",
      "Peaches",
      "https://example.com",
      "https://instagram.com/river",
      null,
      null,
      "4165550100",
      "stall@example.com",
      ["produce"],
    ],
  );
  const saved = await db.query<{
    name: string;
    about: string | null;
    website: string | null;
    instagram: string | null;
    phone: string | null;
    email: string | null;
    tags: string[];
    slug: string;
    status: string;
    claimed_by: string;
    selling_approved: boolean;
  }>(
    `select name, about, website, instagram, phone, email, tags, slug, status::text as status,
            claimed_by::text as claimed_by, selling_approved
     from public.vendors where id = $1`,
    [VENDOR],
  );
  const row = saved.rows[0];
  assert.equal(row?.name, "River Fruit Co");
  assert.equal(row?.about, "Peaches");
  assert.equal(row?.website, "https://example.com");
  assert.equal(row?.instagram, "https://instagram.com/river");
  assert.equal(row?.phone, "4165550100");
  assert.equal(row?.email, "stall@example.com");
  assert.deepEqual(row?.tags, ["produce"]);
  assert.equal(row?.slug, "river-fruit");
  assert.equal(row?.status, "published");
  assert.equal(row?.claimed_by, OWNER);
  assert.equal(row?.selling_approved, false);

  await setAuth(db, "authenticated", OTHER);
  const stranger = await db.query<{ owns: boolean }>("select public.owns_vendor($1) as owns", [VENDOR]);
  assert.equal(stranger.rows[0]?.owns, false);
  const hidden = await db.query<{ portal: unknown }>("select public.my_vendor_portal() as portal");
  assert.deepEqual(portalRows(hidden.rows[0]?.portal), []);
  const denied = await expectRaise(() =>
    db.query(
      `select public.save_owned_vendor($1, 'Taken', null, null, null, null, null, null, null, '{}'::text[])`,
      [VENDOR],
    ),
  );
  assert.equal(denied.code, "42501");
  assert.equal(await vendorOwner(db), OWNER);
  assert.equal(
    (await db.query<{ name: string }>("select name from public.vendors where id = $1", [VENDOR])).rows[0]?.name,
    "River Fruit Co",
  );
});

async function ownedProfile(db: PGlite) {
  const saved = await db.query<{
    name: string;
    about: string | null;
    website: string | null;
    instagram: string | null;
    tiktok: string | null;
    facebook: string | null;
    phone: string | null;
    email: string | null;
    tags: string[];
    slug: string;
    status: string;
    claimed_by: string;
    selling_approved: boolean;
  }>(
    `select name, about, website, instagram, tiktok, facebook, phone, email, tags, slug,
            status::text as status, claimed_by::text as claimed_by, selling_approved
     from public.vendors where id = $1`,
    [VENDOR],
  );
  return saved.rows[0];
}

async function saveProfile(
  db: PGlite,
  fields: {
    name?: string;
    about?: string | null;
    website?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    phone?: string | null;
    email?: string | null;
    tags?: string[];
  } = {},
) {
  await db.query(
    `select public.save_owned_vendor($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[])`,
    [
      VENDOR,
      fields.name ?? "River Fruit",
      fields.about ?? null,
      fields.website ?? null,
      fields.instagram ?? null,
      fields.tiktok ?? null,
      fields.facebook ?? null,
      fields.phone ?? null,
      fields.email ?? null,
      fields.tags ?? [],
    ],
  );
}

test("an owner can trim the profile and clear it without touching the address", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);
  await setAuth(db, "authenticated", OWNER);

  await saveProfile(db, {
    name: "  River Fruit Co  ",
    about: "  Peaches  ",
    website: "https://example.com",
    instagram: "https://instagram.com/river",
    tiktok: "https://www.tiktok.com/@river",
    facebook: "https://facebook.com/river",
    phone: " 416-555-0100 ",
    email: "Stall@Example.com",
    tags: ["Produce", "jamaican"],
  });
  const saved = await ownedProfile(db);
  assert.equal(saved?.name, "River Fruit Co");
  assert.equal(saved?.about, "Peaches");
  assert.equal(saved?.website, "https://example.com");
  assert.equal(saved?.instagram, "https://instagram.com/river");
  assert.equal(saved?.tiktok, "https://www.tiktok.com/@river");
  assert.equal(saved?.facebook, "https://facebook.com/river");
  assert.equal(saved?.phone, "416-555-0100");
  assert.equal(saved?.email, "stall@example.com");
  assert.deepEqual(saved?.tags, ["produce", "jamaican"]);
  assert.equal(saved?.slug, "river-fruit");
  assert.equal(saved?.status, "published");
  assert.equal(saved?.claimed_by, OWNER);
  assert.equal(saved?.selling_approved, false);

  await saveProfile(db, {
    name: "River Fruit Co",
    about: "   ",
    website: "",
    instagram: "",
    tiktok: "",
    facebook: "",
    phone: "",
    email: "",
    tags: [],
  });
  const cleared = await ownedProfile(db);
  assert.equal(cleared?.name, "River Fruit Co");
  assert.equal(cleared?.about, null);
  assert.equal(cleared?.website, null);
  assert.equal(cleared?.instagram, null);
  assert.equal(cleared?.tiktok, null);
  assert.equal(cleared?.facebook, null);
  assert.equal(cleared?.phone, null);
  assert.equal(cleared?.email, null);
  assert.deepEqual(cleared?.tags, []);
  assert.equal(cleared?.slug, "river-fruit");
  assert.equal(cleared?.claimed_by, OWNER);
});

test("a bad profile write does not change the stall", async () => {
  const db = await database();
  await seedDirectory(db);
  await seedVendorClaim(db, CLAIM, OWNER);
  await setAuth(db, "service_role", null);
  await db.query("select public.decide_claim($1, 'approved', null)", [CLAIM]);
  await setAuth(db, "authenticated", OWNER);
  await saveProfile(db, {
    name: "River Fruit Co",
    about: "Peaches",
    website: "https://example.com",
    phone: "4165550100",
    email: "stall@example.com",
    tags: ["produce"],
  });

  const attempts: Array<{ fields: Parameters<typeof saveProfile>[1]; message: RegExp }> = [
    { fields: { name: "   " }, message: /Add a name/ },
    { fields: { name: "River Fruit Co", phone: "call me" }, message: /phone number is not allowed/ },
    { fields: { name: "River Fruit Co", email: "not-an-email" }, message: /email is not allowed/ },
    { fields: { name: "River Fruit Co", tags: ["nope!"] }, message: /tag is not allowed/ },
    {
      fields: { name: "River Fruit Co", tags: Array.from({ length: 25 }, (_, index) => `tag${index}`) },
      message: /Too many tags/,
    },
    { fields: { name: "River Fruit Co", website: "javascript:alert(1)" }, message: /Listing URL is not allowed/ },
  ];
  for (const attempt of attempts) {
    const raised = await expectRaise(() => saveProfile(db, attempt.fields));
    assert.equal(raised.code, "P0001", attempt.message.source);
    assert.match(raised.message, attempt.message);
  }

  const row = await ownedProfile(db);
  assert.equal(row?.name, "River Fruit Co");
  assert.equal(row?.about, "Peaches");
  assert.equal(row?.website, "https://example.com");
  assert.equal(row?.phone, "4165550100");
  assert.equal(row?.email, "stall@example.com");
  assert.deepEqual(row?.tags, ["produce"]);
  assert.equal(row?.slug, "river-fruit");
  assert.equal(row?.status, "published");
  assert.equal(row?.claimed_by, OWNER);
  assert.equal(row?.selling_approved, false);

  await saveProfile(db, { name: "River Fruit Co", tags: Array.from({ length: 24 }, (_, index) => `tag${index}`) });
  assert.equal((await ownedProfile(db))?.tags.length, 24);
});

test("a signed-out caller cannot open the stall editor", async () => {
  const db = await database();
  await seedDirectory(db);
  await setAuth(db, "service_role", null);
  await db.query("update public.vendors set claimed_by = $1 where id = $2", [OWNER, VENDOR]);
  await setAuth(db, "authenticated", null);
  const raised = await expectRaise(() => db.query("select public.my_vendor_portal()"));
  assert.equal(raised.code, "42501");
});

test("the privilege trigger blocks claimed_by and selling_approved for a non-service role", async () => {
  const db = await database();
  await seedDirectory(db);
  await setAuth(db, "service_role", null);
  await db.query("update public.vendors set claimed_by = $1 where id = $2", [OWNER, VENDOR]);
  await setAuth(db, "authenticated", OWNER);
  const claimChange = await expectRaise(() =>
    db.query("update public.vendors set claimed_by = $1 where id = $2", [OTHER, VENDOR]),
  );
  assert.equal(claimChange.code, "42501");
  assert.match(claimChange.message, /privilege columns/);
  const sellingChange = await expectRaise(() =>
    db.query("update public.vendors set selling_approved = true where id = $1", [VENDOR]),
  );
  assert.equal(sellingChange.code, "42501");
  assert.equal(await vendorOwner(db), OWNER);
  const selling = await db.query<{ selling_approved: boolean }>(
    "select selling_approved from public.vendors where id = $1",
    [VENDOR],
  );
  assert.equal(selling.rows[0]?.selling_approved, false);

  await setAuth(db, "service_role", null);
  await db.query("update public.vendors set selling_approved = true where id = $1", [VENDOR]);
  const opened = await db.query<{ selling_approved: boolean }>(
    "select selling_approved from public.vendors where id = $1",
    [VENDOR],
  );
  assert.equal(opened.rows[0]?.selling_approved, true);
});
