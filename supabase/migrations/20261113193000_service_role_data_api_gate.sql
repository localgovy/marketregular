-- The Data API allowlist used to return immediately for service_role.
-- A copied service-role key could then page catalog tables from any
-- network, TLS fingerprint, or user agent. Service-role HTTP calls now
-- need the server gate. Direct SQL leaves request.path empty and is
-- unchanged. Anon and signed-in portal calls are unchanged.
--
-- The gate hash is not in this file. Insert it before this function
-- enforces, or service-role HTTP calls fail closed:
--   insert into private.data_api_gate (token_hash)
--   values (encode(extensions.digest(convert_to('<server secret>', 'utf8'), 'sha256'), 'hex'));

create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists private.data_api_gate (
  id boolean primary key default true check (id),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$')
);

revoke all on table private.data_api_gate from public, anon, authenticated, service_role;

create or replace function public.reject_postgis_data_api()
returns void
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private', 'extensions', 'auth'
as $fn$
declare
  path text := lower(coalesce(current_setting('request.path', true), ''));
  rpc text;
  headers json;
  presented text;
  expected text;
begin
  if path = '' then
    return;
  end if;
  path := split_part(path, '?', 1);
  if auth.role() = 'service_role' then
    begin
      headers := current_setting('request.headers', true)::json;
    exception
      when others then
        headers := '{}'::json;
    end;
    presented := headers->>'x-marketregular-gate';
    select token_hash into expected from private.data_api_gate where id;
    if presented is not null
      and length(presented) between 32 and 200
      and expected is not null
      and encode(extensions.digest(convert_to(presented, 'utf8'), 'sha256'), 'hex') = expected
    then
      return;
    end if;
    raise exception 'not allowed' using errcode = '42501';
  end if;

  rpc := substring(path from '/rpc/([^/]+)');
  if rpc is not null then
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
  end if;

  if path ~ '/(listing_slug_aliases|posts|reviews|profiles|saves|portal_applications|claim_requests)(/|$)' then
    return;
  end if;

  raise exception 'not allowed' using errcode = '42501';
end;
$fn$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;

notify pgrst, 'reload config';
