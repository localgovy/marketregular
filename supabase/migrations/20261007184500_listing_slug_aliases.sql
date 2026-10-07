-- When admin or a seeder changes a public slug, keep the old URL as a 308.
-- The app reads this table from src/proxy.ts. Historical merges stay in
-- src/data/listing-redirects.ts; this table is for in-place renames going forward.

create table public.listing_slug_aliases (
  kind text not null check (kind in ('market', 'vendor')),
  from_slug text not null check (from_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(from_slug) <= 80),
  to_slug text not null check (to_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(to_slug) <= 80),
  created_at timestamptz not null default now(),
  primary key (kind, from_slug),
  check (from_slug <> to_slug)
);

comment on table public.listing_slug_aliases is
  'Old public slugs after a rename. Proxy 308s /vendors/{from} and /markets/{from} in one hop.';

alter table public.listing_slug_aliases enable row level security;

revoke all on table public.listing_slug_aliases from public, anon, authenticated;
grant select on table public.listing_slug_aliases to anon, authenticated, service_role;

create policy listing_slug_aliases_select
on public.listing_slug_aliases
for select
to anon, authenticated
using (true);

create or replace function private.record_listing_slug_alias()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text := tg_argv[0];
begin
  if k is null or k not in ('market', 'vendor') then
    return new;
  end if;
  if new.slug is not distinct from old.slug then
    return new;
  end if;
  if old.slug is null or new.slug is null then
    return new;
  end if;

  -- The new live slug must not redirect away from itself.
  delete from public.listing_slug_aliases
  where kind = k
    and from_slug = new.slug;

  -- Collapse A→old into A→new so crawlers never hop twice.
  update public.listing_slug_aliases
  set to_slug = new.slug
  where kind = k
    and to_slug = old.slug
    and from_slug <> new.slug;

  insert into public.listing_slug_aliases (kind, from_slug, to_slug)
  values (k, old.slug, new.slug)
  on conflict (kind, from_slug) do update
    set to_slug = excluded.to_slug;

  delete from public.listing_slug_aliases
  where kind = k
    and from_slug = to_slug;

  return new;
end;
$$;

revoke all on function private.record_listing_slug_alias() from public, anon, authenticated;

drop trigger if exists vendors_record_slug_alias on public.vendors;
create trigger vendors_record_slug_alias
after update of slug on public.vendors
for each row
when (old.slug is distinct from new.slug)
execute function private.record_listing_slug_alias('vendor');

drop trigger if exists markets_record_slug_alias on public.markets;
create trigger markets_record_slug_alias
after update of slug on public.markets
for each row
when (old.slug is distinct from new.slug)
execute function private.record_listing_slug_alias('market');
