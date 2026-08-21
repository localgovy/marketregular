-- Nightly Toronto directory tally for the homepage census.
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create schema if not exists private;

create table public.directory_census (
  id text primary key,
  markets integer not null,
  vendors integer not null,
  tallied_at timestamptz not null default now()
);

alter table public.directory_census enable row level security;

create policy "census readable"
  on public.directory_census
  for select
  using (true);

create function private.refresh_directory_census()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.directory_census (id, markets, vendors, tallied_at)
  values (
    'toronto',
    (
      select count(*)::integer
      from public.markets
      where status = 'published'
        and lower(city) = 'toronto'
    ),
    (
      select count(distinct v.id)::integer
      from public.vendors v
      join public.market_vendors mv on mv.vendor_id = v.id
      join public.markets m on m.id = mv.market_id
      where v.status = 'published'
        and m.status = 'published'
        and lower(m.city) = 'toronto'
    ),
    now()
  )
  on conflict (id) do update
    set markets = excluded.markets,
        vendors = excluded.vendors,
        tallied_at = excluded.tallied_at;
end;
$$;

revoke all on function private.refresh_directory_census() from public;
grant execute on function private.refresh_directory_census() to postgres;

select private.refresh_directory_census();

select cron.schedule(
  'directory-census-nightly',
  '15 5 * * *',
  $$select private.refresh_directory_census()$$
);
