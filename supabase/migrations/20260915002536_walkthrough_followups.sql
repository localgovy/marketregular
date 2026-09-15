-- Leftover reviews geofence RPC. Floor notes use confirm_on_site on posts.
drop function if exists public.confirm_review_on_site(uuid, double precision, double precision);

create index if not exists market_schedules_market_id_idx
  on public.market_schedules (market_id);

create index if not exists market_vendors_vendor_id_idx
  on public.market_vendors (vendor_id);

create index if not exists vendor_menus_vendor_id_idx
  on public.vendor_menus (vendor_id);

create index if not exists posts_user_created_idx
  on public.posts (user_id, created_at desc);

create index if not exists reviews_vendor_id_idx
  on public.reviews (vendor_id)
  where vendor_id is not null;

create index if not exists claim_requests_user_created_idx
  on public.claim_requests (user_id, created_at desc);

-- PostGIS objects are owned by supabase_admin. postgres REVOKE is a no-op on those ACLs.
do $$
begin
  set local role supabase_admin;
  revoke all on function public.st_estimatedextent(text, text)
    from public, anon, authenticated;
  revoke all on function public.st_estimatedextent(text, text, text)
    from public, anon, authenticated;
  revoke all on function public.st_estimatedextent(text, text, text, boolean)
    from public, anon, authenticated;
exception
  when insufficient_privilege then
    raise notice 'st_estimatedextent revoke skipped';
  when undefined_function then
    raise notice 'st_estimatedextent missing';
  when others then
    raise notice 'st_estimatedextent revoke skipped: %', sqlerrm;
end;
$$;

do $$
begin
  set local role supabase_admin;
  alter table public.spatial_ref_sys enable row level security;
  drop policy if exists spatial_ref_sys_no_client on public.spatial_ref_sys;
  create policy spatial_ref_sys_no_client
    on public.spatial_ref_sys
    for all
    to anon, authenticated
    using (false)
    with check (false);
exception
  when insufficient_privilege then
    raise notice 'spatial_ref_sys rls skipped';
  when undefined_table then
    raise notice 'spatial_ref_sys missing';
  when others then
    raise notice 'spatial_ref_sys rls skipped: %', sqlerrm;
end;
$$;
