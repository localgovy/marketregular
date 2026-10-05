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
const VENDOR = "44444444-4444-4444-8444-444444444444";
const migration = "supabase/migrations/20261005202516_maintenance_opt_outs.sql";

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

${extractFunction("supabase/migrations/20261003180410_security_checkout_and_password_lockdown.sql", "password_change_pending")}
${extractFunction(migration, "maintenance_opt_outs_ok")}

create table public.markets (
  id uuid primary key,
  name text not null,
  claimed_by uuid,
  maintenance_opt_outs text[] not null default '{}',
  constraint markets_maintenance_opt_outs_ok
    check (public.maintenance_opt_outs_ok('market', maintenance_opt_outs))
);
create table public.vendors (
  id uuid primary key,
  name text not null,
  claimed_by uuid,
  maintenance_opt_outs text[] not null default '{}',
  constraint vendors_maintenance_opt_outs_ok
    check (public.maintenance_opt_outs_ok('vendor', maintenance_opt_outs))
);

${extractFunction("supabase/migrations/20261003180410_security_checkout_and_password_lockdown.sql", "owns_vendor")}
${extractFunction("supabase/migrations/20261005180000_market_portal.sql", "owns_market")}
${extractFunction(migration, "save_owned_maintenance_opt_outs")}
`;

async function database() {
  const db = new PGlite();
  await db.exec(schema);
  await db.query(
    "insert into public.markets (id, name, claimed_by) values ($1, 'Withrow', $2)",
    [MARKET, OWNER],
  );
  await db.query(
    "insert into public.vendors (id, name, claimed_by) values ($1, 'River Fruit', $2)",
    [VENDOR, OWNER],
  );
  return db;
}

async function setAuth(db: PGlite, role: string, uid: string | null, claims: Record<string, unknown> = {}) {
  await db.query("update auth.session set role = $1, uid = $2, claims = $3::jsonb", [
    role,
    uid,
    JSON.stringify(claims),
  ]);
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

async function optOuts(db: PGlite, table: "vendors" | "markets", id: string) {
  const result = await db.query<{ maintenance_opt_outs: string[] }>(
    `select maintenance_opt_outs from public.${table} where id = $1`,
    [id],
  );
  return result.rows[0]?.maintenance_opt_outs ?? null;
}

function save(db: PGlite, kind: string, id: string, sections: string[] | null) {
  return db.query("select public.save_owned_maintenance_opt_outs($1, $2, $3::text[])", [kind, id, sections]);
}

test("only the owner can replace opt-outs, and a bad list changes nothing", async () => {
  const db = await database();
  await setAuth(db, "authenticated", OTHER);
  const stranger = await expectRaise(() => save(db, "vendor", VENDOR, ["menu"]));
  assert.equal(stranger.code, "42501");
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), []);

  await setAuth(db, "authenticated", OWNER);
  const unknown = await expectRaise(() => save(db, "vendor", VENDOR, ["nope"]));
  assert.match(unknown.message, /That section is not allowed/);
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), []);

  const duplicate = await expectRaise(() => save(db, "vendor", VENDOR, ["about", "about"]));
  assert.match(duplicate.message, /That section is not allowed/);
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), []);

  const wrongKind = await expectRaise(() => save(db, "market", MARKET, ["menu"]));
  assert.match(wrongKind.message, /That section is not allowed/);
  assert.deepEqual(await optOuts(db, "markets", MARKET), []);

  const empty = await expectRaise(() => save(db, "vendor", VENDOR, null));
  assert.match(empty.message, /That section is not allowed/);
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), []);

  await save(db, "vendor", VENDOR, ["menu", "about"]);
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), ["menu", "about"]);
  await save(db, "vendor", VENDOR, ["logo"]);
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), ["logo"]);
  await save(db, "vendor", VENDOR, []);
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), []);

  await save(db, "market", MARKET, ["hours", "place"]);
  assert.deepEqual(await optOuts(db, "markets", MARKET), ["hours", "place"]);

  await setAuth(db, "authenticated", OWNER, { app_metadata: { must_set_password: true } });
  const pending = await expectRaise(() => save(db, "vendor", VENDOR, ["tags"]));
  assert.equal(pending.code, "42501");
  assert.deepEqual(await optOuts(db, "vendors", VENDOR), []);
});
