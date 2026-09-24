-- PostGIS stays in public so is_within_market and nearby_markets keep working.
-- Those functions call st_* in SQL. This only stops the Data API from reaching
-- the PostGIS catalog and PostGIS RPCs. postgres cannot revoke supabase_admin
-- grants, so the PostgREST pre-request is the control that actually applies.

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
  -- Direct SQL (migrations, geofence checks) does not set request.path.
  if path = '' then
    return;
  end if;
  path := split_part(path, '?', 1);
  if path ~ '/(spatial_ref_sys|geometry_columns|geography_columns)(/|$)' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  rpc := substring(path from '/rpc/([^/]+)');
  if rpc is null then
    return;
  end if;
  if rpc ~ '^(st_|_st_|_postgis|postgis_|addgeometrycolumn|dropgeometrycolumn|dropgeometrytable|populate_geometry_columns|lockrow|addauth|checkauth|updategeometrysrid|find_srid|get_proj4_from_srid|enablelongtransactions|disablelongtransactions|longtransactionsenabled|unlockrows)' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;

alter role authenticator set pgrst.db_pre_request = 'public.reject_postgis_data_api';
notify pgrst, 'reload config';

-- Best-effort. These objects are owned by supabase_admin, so the revoke and
-- RLS statements no-op when this migration runs as postgres.
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname in (
          'st_estimatedextent',
          'addgeometrycolumn',
          'dropgeometrycolumn',
          'dropgeometrytable',
          'populate_geometry_columns',
          'updategeometrysrid',
          'lockrow',
          'addauth',
          'checkauth',
          'unlockrows',
          'enablelongtransactions',
          'disablelongtransactions',
          'longtransactionsenabled',
          'find_srid',
          'get_proj4_from_srid'
        )
      )
  loop
    begin
      execute format(
        'revoke all on function %s from public, anon, authenticated',
        fn
      );
    exception
      when insufficient_privilege then
        null;
    end;
  end loop;
end $$;

do $$
begin
  execute 'revoke all on table public.spatial_ref_sys from public, anon, authenticated';
  execute 'revoke all on table public.geometry_columns from public, anon, authenticated';
  execute 'revoke all on table public.geography_columns from public, anon, authenticated';
  execute 'alter table public.spatial_ref_sys enable row level security';
exception
  when insufficient_privilege then
    raise notice 'postgis catalog lockdown skipped: %', sqlerrm;
end $$;
