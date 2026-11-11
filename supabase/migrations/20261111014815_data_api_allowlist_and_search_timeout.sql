-- Table access on the Data API is an allowlist. A new public table stays
-- closed until it is named here. Signed-in portal RPCs are unchanged.
-- Direct SQL does not set request.path, so migrations and the server role
-- are not affected. search_products cannot outlive the app's 8s abort.

create or replace function public.reject_postgis_data_api()
returns void
language plpgsql
stable
security invoker
set search_path to 'public'
as $fn$
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

alter function public.search_products(text, boolean, text, integer, integer, integer)
  set statement_timeout to '8s';

notify pgrst, 'reload schema';
