-- menu_vendor_ids() scanned every published vendor for a menu row (~50ms warm,
-- much slower when Disk IO was exhausted). Keep one ordered uuid[] and refresh
-- it when menus or vendor status change.

create schema if not exists private;

create table public.menu_vendor_id_cache (
  id smallint primary key default 1 check (id = 1),
  vendor_ids uuid[] not null default '{}',
  refreshed_at timestamptz not null default now()
);

comment on table public.menu_vendor_id_cache is
  'Single row of published vendor ids that have a menu. public.menu_vendor_ids() reads this instead of scanning vendor_menus.';

alter table public.menu_vendor_id_cache enable row level security;

revoke all on table public.menu_vendor_id_cache from public, anon, authenticated;
grant select on table public.menu_vendor_id_cache to service_role;

create or replace function private.refresh_menu_vendor_ids()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.menu_vendor_id_cache (id, vendor_ids, refreshed_at)
  select
    1,
    coalesce(array_agg(v.id order by v.id), '{}'::uuid[]),
    now()
  from public.vendors v
  where v.status = 'published'
    and exists (
      select 1
      from public.vendor_menus vm
      where vm.vendor_id = v.id
    )
  on conflict (id) do update
    set vendor_ids = excluded.vendor_ids,
        refreshed_at = excluded.refreshed_at;
end;
$$;

create or replace function private.touch_menu_vendor_ids()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_menu_vendor_ids();
  return null;
end;
$$;

revoke all on function private.refresh_menu_vendor_ids() from public;
revoke all on function private.touch_menu_vendor_ids() from public;

select private.refresh_menu_vendor_ids();

create or replace function public.menu_vendor_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select vendor_ids from public.menu_vendor_id_cache where id = 1),
    '{}'::uuid[]
  );
$$;

revoke all on function public.menu_vendor_ids() from public, anon, authenticated;
grant execute on function public.menu_vendor_ids() to service_role;

drop trigger if exists menu_vendor_id_cache_on_vendor_menus on public.vendor_menus;
create trigger menu_vendor_id_cache_on_vendor_menus
after insert or update or delete or truncate on public.vendor_menus
for each statement
execute function private.touch_menu_vendor_ids();

drop trigger if exists menu_vendor_id_cache_on_vendors on public.vendors;
create trigger menu_vendor_id_cache_on_vendors
after insert or update of status or delete or truncate on public.vendors
for each statement
execute function private.touch_menu_vendor_ids();

-- market_vendors.vendor_id was added in 20260915002536. Repeat it so a database
-- that missed that migration still has the lookup index.
create index if not exists market_vendors_vendor_id_idx
  on public.market_vendors (vendor_id);

-- market_id lookups already use market_vendors_pkey (market_id, vendor_id).
-- A second index on market_id alone would duplicate that prefix and add write IO.

create or replace function public.reject_postgis_data_api()
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  path text := lower(coalesce(current_setting('request.path', true), ''));
  rpc text;
begin
  if path = '' then
    return;
  end if;
  path := split_part(path, '?', 1);
  if auth.role() = 'service_role' then
    return;
  end if;
  if path ~ '/(spatial_ref_sys|geometry_columns|geography_columns)(/|$)'
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|menu_classifiers|vendor_menu_classifier_assignments|vendor_menu_classifier_reviews|search_terms|search_term_classifiers|directory_census|menu_vendor_id_cache|markets|vendors|vendor_stripe_accounts|vendor_sign_in_secrets|orders|platform_fees|platform_fee_payments|platform_fee_sessions)(/|$)'
  then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  rpc := substring(path from '/rpc/([^/]+)');
  if rpc is null then
    return;
  end if;
  if auth.role() = 'authenticated'
    and rpc in (
      'is_admin',
      'my_profile',
      'stamp_onboarded_at',
      'owns_vendor',
      'has_owned_vendor',
      'awaiting_vendor_portal',
      'my_vendor_portal',
      'save_owned_vendor',
      'save_owned_maintenance_opt_outs',
      'save_owned_menu_item',
      'delete_owned_menu_item',
      'save_owned_stall',
      'delete_owned_stall',
      'set_owned_menu_sections',
      'owns_market',
      'has_owned_market',
      'awaiting_market_portal',
      'my_market_portal',
      'save_owned_market',
      'save_owned_schedule',
      'delete_owned_schedule',
      'save_market_roster',
      'delete_market_roster',
      'create_market_vendor',
      'save_market_vendor_profile'
    )
  then
    return;
  end if;
  raise exception 'not allowed' using errcode = '42501';
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;
