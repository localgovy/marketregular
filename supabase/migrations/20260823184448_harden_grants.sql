-- Table-level GRANT SELECT cannot be subtracted per column; revoke then re-grant.
-- Function EXECUTE was granted to anon explicitly, not only PUBLIC.

revoke select on table public.markets from anon;
grant select (
  id,
  slug,
  name,
  about,
  address,
  city,
  province,
  postal_code,
  lat,
  lng,
  geofence_radius_m,
  website,
  phone,
  tags,
  status,
  featured,
  created_at,
  updated_at,
  logo_url,
  review_count,
  rating_avg,
  instagram,
  tiktok
) on public.markets to anon;

revoke select on table public.vendors from anon;
grant select (
  id,
  slug,
  name,
  about,
  website,
  phone,
  tags,
  status,
  created_at,
  updated_at,
  logo_url,
  review_count,
  rating_avg,
  instagram,
  tiktok
) on public.vendors to anon;

revoke all on function public.confirm_on_site(uuid, double precision, double precision) from public, anon;
grant execute on function public.confirm_on_site(uuid, double precision, double precision) to authenticated;

revoke all on function public.confirm_review_on_site(uuid, double precision, double precision) from public, anon;
grant execute on function public.confirm_review_on_site(uuid, double precision, double precision) to authenticated;

revoke all on function public.guard_post_insert() from public, anon, authenticated;
revoke all on function public.guard_review_insert() from public, anon, authenticated;
revoke all on function public.protect_profile_role() from public, anon, authenticated;
revoke all on function public.protect_market_privilege_columns() from public, anon, authenticated;
revoke all on function public.protect_vendor_privilege_columns() from public, anon, authenticated;

-- Grants on spatial_ref_sys were issued by supabase_admin, so postgres REVOKE no-ops.
do $$
begin
  set local role supabase_admin;
  revoke all on table public.spatial_ref_sys from anon, authenticated, public;
exception
  when insufficient_privilege then
    -- fall through; postgres may still revoke its own grants
    null;
end;
$$;

revoke all on table public.spatial_ref_sys from anon, authenticated, public;
