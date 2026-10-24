import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(
  join(root, "supabase/migrations/20261024214500_menu_vendor_id_cache.sql"),
  "utf8",
);

const PUBLISHED = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DRAFT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function asIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).sort();
  if (typeof value === "string") {
    return value
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .sort();
  }
  return [];
}

async function idsOf(db: PGlite) {
  const result = await db.query<{ menu_vendor_ids: unknown }>(
    "select public.menu_vendor_ids() as menu_vendor_ids",
  );
  return asIds(result.rows[0]?.menu_vendor_ids);
}

test("menu_vendor_ids reads the refreshed cache and follows menu changes", async () => {
  const db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.role()
    returns text
    language sql
    stable
    as $$ select 'service_role'::text $$;

    do $$ begin
      create role anon nologin;
    exception when duplicate_object then null;
    end $$;
    do $$ begin
      create role authenticated nologin;
    exception when duplicate_object then null;
    end $$;
    do $$ begin
      create role service_role nologin;
    exception when duplicate_object then null;
    end $$;

    create table public.vendors (
      id uuid primary key,
      status text not null
    );
    create table public.vendor_menus (
      id uuid primary key,
      vendor_id uuid not null references public.vendors (id) on delete cascade
    );
    create table public.market_vendors (
      market_id uuid not null,
      vendor_id uuid not null,
      primary key (market_id, vendor_id)
    );
    create index vendor_menus_vendor_id_idx on public.vendor_menus (vendor_id);
  `);
  await db.exec(migration);

  assert.deepEqual(await idsOf(db), []);

  await db.query("insert into public.vendors (id, status) values ($1, 'published'), ($2, 'published'), ($3, 'draft')", [
    PUBLISHED,
    OTHER,
    DRAFT,
  ]);
  await db.query(
    "insert into public.vendor_menus (id, vendor_id) values ($1, $2), ($3, $4)",
    [crypto.randomUUID(), PUBLISHED, crypto.randomUUID(), DRAFT],
  );
  assert.deepEqual(await idsOf(db), [PUBLISHED]);

  await db.query("insert into public.vendor_menus (id, vendor_id) values ($1, $2)", [
    crypto.randomUUID(),
    OTHER,
  ]);
  assert.deepEqual(await idsOf(db), [OTHER, PUBLISHED].sort());

  await db.query("update public.vendors set status = 'draft' where id = $1", [PUBLISHED]);
  assert.deepEqual(await idsOf(db), [OTHER]);

  await db.query("delete from public.vendor_menus where vendor_id = $1", [OTHER]);
  assert.deepEqual(await idsOf(db), []);

  const indexes = await db.query<{ indexname: string }>(
    "select indexname from pg_indexes where schemaname = 'public' and tablename = 'market_vendors' order by indexname",
  );
  assert.deepEqual(
    indexes.rows.map((row) => row.indexname),
    ["market_vendors_pkey", "market_vendors_vendor_id_idx"],
  );
});
