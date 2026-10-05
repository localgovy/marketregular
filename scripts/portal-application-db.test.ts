import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = "supabase/migrations/20261005192933_portal_applications.sql";
const fixes = "supabase/migrations/20261005211604_portal_account_editor_fixes.sql";
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const VENDOR = "44444444-4444-4444-8444-444444444444";
const DRAFT = "45454545-4545-4545-8545-454545454545";
const MARKET = "55555555-5555-4555-8555-555555555555";
const APP = "66666666-6666-4666-8666-666666666666";
const APP2 = "77777777-7777-4777-8777-777777777777";

function extractFunction(name: string, relativePath = migration) {
  const sql = readFileSync(join(root, relativePath), "utf8");
  const lowered = sql.toLowerCase();
  const signature = `function public.${name.toLowerCase()}`;
  const at = lowered.indexOf(signature);
  if (at < 0) throw new Error(`Missing ${name}`);
  const createAt = lowered.lastIndexOf("create or replace function", at);
  const header = sql.slice(createAt);
  const asMatch = header.match(/\bas\s+(\$[A-Za-z0-9_]*\$)/);
  if (!asMatch || asMatch.index == null) throw new Error(`Missing body for ${name}`);
  const tag = asMatch[1]!;
  const bodyAt = createAt + asMatch.index + asMatch[0].length;
  const close = sql.indexOf(tag, bodyAt);
  const end = sql.indexOf(";", close + tag.length);
  return sql.slice(createAt, end + 1);
}

const assignSql = extractFunction("assign_portal_application");
const schema = `
create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  email text
);
create table auth.session (
  role text not null,
  uid uuid
);
insert into auth.session (role, uid) values ('anon', null);
create function auth.role() returns text language sql stable as $$ select role from auth.session $$;
create function auth.uid() returns uuid language sql stable as $$ select uid from auth.session $$;

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
  status public.listing_status not null default 'published',
  claimed_by uuid references public.profiles (id)
);
create table public.vendors (
  id uuid primary key,
  slug text not null,
  name text not null,
  status public.listing_status not null default 'draft',
  claimed_by uuid references public.profiles (id)
);
create table public.claim_requests (
  id uuid primary key,
  user_id uuid not null references public.profiles (id),
  target_type public.claim_target not null,
  target_id uuid not null,
  evidence text not null,
  status public.claim_status not null default 'pending'
);
create table public.portal_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.claim_target not null,
  organization_name text,
  requested_target_id uuid,
  assigned_target_id uuid,
  status public.claim_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_applications_request_shape check (
    (
      requested_target_id is not null
      and organization_name is null
    )
    or (
      requested_target_id is null
      and organization_name is not null
      and char_length(organization_name) between 1 and 120
    )
  )
);
create unique index portal_applications_one_pending_idx
  on public.portal_applications (user_id, kind)
  where status = 'pending';

${extractFunction("guard_portal_application", fixes)}
${assignSql}
${extractFunction("reject_portal_application")}
${extractFunction("awaiting_vendor_portal")}
${extractFunction("awaiting_market_portal")}

create trigger guard_portal_application
  before insert or update on public.portal_applications
  for each row execute function public.guard_portal_application();
`;

async function database() {
  const db = new PGlite();
  await db.exec(schema);
  return db;
}

async function setAuth(db: PGlite, role: string, uid: string | null) {
  await db.query("update auth.session set role = $1, uid = $2", [role, uid]);
}

async function seed(db: PGlite, ownerRole: "user" | "admin" = "user") {
  await db.query(
    "insert into public.profiles (id, role) values ($1, $2::public.user_role), ($3, 'user')",
    [OWNER, ownerRole, OTHER],
  );
  await db.query(
    "insert into auth.users (id, email) values ($1, 'owner@example.com'), ($2, 'other@example.com')",
    [OWNER, OTHER],
  );
  await db.query(
    "insert into public.vendors (id, slug, name, status) values ($1, 'river-fruit', 'River Fruit', 'published'), ($2, 'draft-stand', 'Draft Stand', 'draft')",
    [VENDOR, DRAFT],
  );
  await db.query(
    "insert into public.markets (id, slug, name, status) values ($1, 'withrow', 'Withrow', 'published')",
    [MARKET],
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

async function application(db: PGlite, id: string) {
  const result = await db.query<{
    status: string;
    assigned_target_id: string | null;
    organization_name: string | null;
    user_id: string;
  }>(
    `select status::text as status, assigned_target_id::text as assigned_target_id,
            organization_name, user_id::text as user_id
     from public.portal_applications where id = $1`,
    [id],
  );
  return result.rows[0];
}

test("assignment does not mention a password", () => {
  assert.doesNotMatch(assignSql, /password/i);
  assert.match(extractFunction("awaiting_vendor_portal"), /portal_applications/);
  assert.match(extractFunction("awaiting_market_portal"), /portal_applications/);
});

test("a signed-in person cannot approve their own request", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  await db.query(
    `insert into public.portal_applications (id, user_id, kind, requested_target_id)
     values ($1, $2, 'vendor', $3)`,
    [APP, OTHER, VENDOR],
  );
  const row = await application(db, APP);
  assert.equal(row?.user_id, OWNER);
  assert.equal(row?.status, "pending");
  assert.equal(row?.assigned_target_id, null);

  await db.query(
    "update public.portal_applications set status = 'approved', assigned_target_id = $2 where id = $1",
    [APP, VENDOR],
  );
  const after = await application(db, APP);
  assert.equal(after?.status, "pending");
  assert.equal(after?.assigned_target_id, null);

  const raised = await expectRaise(() => db.query("select public.assign_portal_application($1, $2)", [APP, VENDOR]));
  assert.equal(raised.code, "42501");
  const owner = await db.query<{ claimed_by: string | null }>(
    "select claimed_by::text as claimed_by from public.vendors where id = $1",
    [VENDOR],
  );
  assert.equal(owner.rows[0]?.claimed_by ?? null, null);
});

test("a listing request has to be published, and an organization name stands alone", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  const draft = await expectRaise(() =>
    db.query(
      `insert into public.portal_applications (kind, requested_target_id) values ('vendor', $1)`,
      [DRAFT],
    ),
  );
  assert.equal(draft.code, "P0001");
  assert.match(draft.message, /listing is missing/);

  const blank = await expectRaise(() =>
    db.query("insert into public.portal_applications (kind, organization_name) values ('vendor', '   ')"),
  );
  assert.equal(blank.code, "P0001");
  assert.match(blank.message, /organization name/);

  await db.query(
    "insert into public.portal_applications (id, kind, organization_name, requested_target_id) values ($1, 'market', '  Withrow Market  ', $2)",
    [APP, MARKET],
  );
  const row = await application(db, APP);
  assert.equal(row?.organization_name, null);
  const kind = await db.query<{ kind: string; requested_target_id: string }>(
    "select kind::text as kind, requested_target_id::text as requested_target_id from public.portal_applications where id = $1",
    [APP],
  );
  assert.equal(kind.rows[0]?.kind, "market");
  assert.equal(kind.rows[0]?.requested_target_id, MARKET);
});

test("assigning a stall sets the owner only while it is free", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  await db.query(
    "insert into public.portal_applications (id, kind, requested_target_id) values ($1, 'vendor', $2)",
    [APP, VENDOR],
  );
  await setAuth(db, "service_role", null);
  await db.query("select public.assign_portal_application($1, $2)", [APP, VENDOR]);
  const owner = await db.query<{ claimed_by: string | null; role: string }>(
    `select v.claimed_by::text as claimed_by, p.role::text as role
     from public.vendors v join public.profiles p on p.id = $2
     where v.id = $1`,
    [VENDOR, OWNER],
  );
  assert.equal(owner.rows[0]?.claimed_by, OWNER);
  assert.equal(owner.rows[0]?.role, "vendor");
  assert.equal((await application(db, APP))?.status, "approved");
  assert.equal((await application(db, APP))?.assigned_target_id, VENDOR);

  await setAuth(db, "authenticated", OTHER);
  await db.query(
    "insert into public.portal_applications (id, kind, organization_name) values ($1, 'vendor', 'Other Stand')",
    [APP2],
  );
  await setAuth(db, "service_role", null);
  const taken = await expectRaise(() => db.query("select public.assign_portal_application($1, $2)", [APP2, VENDOR]));
  assert.equal(taken.code, "P0001");
  assert.match(taken.message, /Someone else already runs this stall/);
  const still = await db.query<{ claimed_by: string | null }>(
    "select claimed_by::text as claimed_by from public.vendors where id = $1",
    [VENDOR],
  );
  assert.equal(still.rows[0]?.claimed_by, OWNER);
  assert.equal((await application(db, APP2))?.status, "pending");
});

test("an admin keeps the admin role, and a market assignment leaves the role alone", async () => {
  const db = await database();
  await seed(db, "admin");
  await setAuth(db, "authenticated", OWNER);
  await db.query(
    "insert into public.portal_applications (id, kind, requested_target_id) values ($1, 'vendor', $2)",
    [APP, VENDOR],
  );
  await setAuth(db, "service_role", null);
  await db.query("select public.assign_portal_application($1, $2)", [APP, VENDOR]);
  const role = await db.query<{ role: string }>("select role::text as role from public.profiles where id = $1", [OWNER]);
  assert.equal(role.rows[0]?.role, "admin");

  await setAuth(db, "authenticated", OTHER);
  await db.query(
    "insert into public.portal_applications (id, kind, requested_target_id) values ($1, 'market', $2)",
    [APP2, MARKET],
  );
  await setAuth(db, "service_role", null);
  await db.query("select public.assign_portal_application($1, $2)", [APP2, MARKET]);
  const other = await db.query<{ role: string }>("select role::text as role from public.profiles where id = $1", [OTHER]);
  const market = await db.query<{ claimed_by: string | null }>(
    "select claimed_by::text as claimed_by from public.markets where id = $1",
    [MARKET],
  );
  assert.equal(other.rows[0]?.role, "user");
  assert.equal(market.rows[0]?.claimed_by, OTHER);
  assert.equal((await application(db, APP2))?.status, "approved");
});

test("a pending application skips shopper onboarding, and a rejection can be asked again", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  await db.query(
    "insert into public.portal_applications (id, kind, organization_name) values ($1, 'vendor', 'River Fruit')",
    [APP],
  );
  const waiting = await db.query<{ vendor: boolean; market: boolean }>(
    "select public.awaiting_vendor_portal() as vendor, public.awaiting_market_portal() as market",
  );
  assert.equal(waiting.rows[0]?.vendor, true);
  assert.equal(waiting.rows[0]?.market, false);

  await setAuth(db, "service_role", null);
  await db.query("select public.reject_portal_application($1)", [APP]);
  assert.equal((await application(db, APP))?.status, "rejected");
  await setAuth(db, "authenticated", OWNER);
  const after = await db.query<{ vendor: boolean }>("select public.awaiting_vendor_portal() as vendor");
  assert.equal(after.rows[0]?.vendor, false);

  await db.query(
    "insert into public.claim_requests (id, user_id, target_type, target_id, evidence) values ($1, $2, 'market', $3, 'older request')",
    [APP2, OWNER, MARKET],
  );
  const legacy = await db.query<{ market: boolean }>("select public.awaiting_market_portal() as market");
  assert.equal(legacy.rows[0]?.market, true);

  await db.query(
    "insert into public.portal_applications (kind, organization_name) values ('vendor', 'River Fruit again')",
  );
  const again = await db.query<{ count: string }>(
    "select count(*)::text as count from public.portal_applications where user_id = $1 and kind = 'vendor' and status = 'pending'",
    [OWNER],
  );
  assert.equal(again.rows[0]?.count, "1");
});

test("a fourth request in an hour is refused", async () => {
  const db = await database();
  await seed(db);
  await setAuth(db, "authenticated", OWNER);
  for (let i = 0; i < 3; i += 1) {
    await db.query(
      "insert into public.portal_applications (kind, organization_name) values ('vendor', $1)",
      [`Stand ${i}`],
    );
    await setAuth(db, "service_role", null);
    const pending = await db.query<{ id: string }>(
      "select id::text as id from public.portal_applications where user_id = $1 and status = 'pending'",
      [OWNER],
    );
    await db.query("select public.reject_portal_application($1)", [pending.rows[0]?.id]);
    await setAuth(db, "authenticated", OWNER);
  }
  const raised = await expectRaise(() =>
    db.query("insert into public.portal_applications (kind, organization_name) values ('vendor', 'Stand 4')"),
  );
  assert.equal(raised.code, "P0001");
  assert.match(raised.message, /another request/);
});

test("a listing someone else already runs cannot be requested", async () => {
  const db = await database();
  await seed(db);
  await db.query("update public.vendors set claimed_by = $1 where id = $2", [OWNER, VENDOR]);
  await setAuth(db, "authenticated", OTHER);
  const raised = await expectRaise(() =>
    db.query(
      "insert into public.portal_applications (kind, requested_target_id) values ('vendor', $1)",
      [VENDOR],
    ),
  );
  assert.equal(raised.code, "P0001");
  assert.match(raised.message, /Someone else already runs this stall/);
  const rows = await db.query("select id from public.portal_applications");
  assert.equal(rows.rows.length, 0);
});
