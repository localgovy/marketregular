-- Readable stall passwords for admin. Sign-in still stores a hash.
-- This table holds the encrypted copy. No API role can select it.

create table public.vendor_sign_in_secrets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  ciphertext text not null,
  chosen boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint vendor_sign_in_secrets_ciphertext_len check (
    char_length(ciphertext) between 20 and 500
  )
);

alter table public.vendor_sign_in_secrets enable row level security;
alter table public.vendor_sign_in_secrets force row level security;

revoke all on table public.vendor_sign_in_secrets from public, anon, authenticated;
grant all on table public.vendor_sign_in_secrets to service_role;

create trigger vendor_sign_in_secrets_updated_at
  before update on public.vendor_sign_in_secrets
  for each row execute function public.set_updated_at();

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
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|directory_census|markets|vendors|vendor_stripe_accounts|vendor_sign_in_secrets)(/|$)'
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
      'save_owned_menu_item',
      'delete_owned_menu_item',
      'save_owned_stall',
      'delete_owned_stall'
    )
  then
    return;
  end if;
  raise exception 'not allowed' using errcode = '42501';
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;
