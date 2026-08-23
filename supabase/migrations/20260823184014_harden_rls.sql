-- Lock privilege columns, post/review integrity, Data API grants, and function search_path.

-- Profiles: only the service role may change role (blocks self-promote via PostgREST).
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.role() is distinct from 'service_role' then
    raise exception 'role cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row
  execute function public.protect_profile_role();

-- Claimants may edit copy/contact, not status, slug, geofence, or claim ownership.
create or replace function public.protect_market_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.status := old.status;
  new.featured := old.featured;
  new.claimed_by := old.claimed_by;
  new.slug := old.slug;
  new.lat := old.lat;
  new.lng := old.lng;
  new.geofence_radius_m := old.geofence_radius_m;
  return new;
end;
$$;

create or replace function public.protect_vendor_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  new.status := old.status;
  new.claimed_by := old.claimed_by;
  new.slug := old.slug;
  return new;
end;
$$;

drop trigger if exists protect_market_privilege_columns on public.markets;
create trigger protect_market_privilege_columns
  before update on public.markets
  for each row
  execute function public.protect_market_privilege_columns();

drop trigger if exists protect_vendor_privilege_columns on public.vendors;
create trigger protect_vendor_privilege_columns
  before update on public.vendors
  for each row
  execute function public.protect_vendor_privilege_columns();

-- Posts: 10/day cap and no self-attested on-site badge. Reviews: no self-attested badge.
create or replace function public.guard_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.verified_on_site := false;
    if (
      select count(*) from public.posts
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Daily review limit reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.verified_on_site := false;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_post_insert on public.posts;
create trigger guard_post_insert
  before insert on public.posts
  for each row
  execute function public.guard_post_insert();

drop trigger if exists guard_review_insert on public.reviews;
create trigger guard_review_insert
  before insert on public.reviews
  for each row
  execute function public.guard_review_insert();

drop policy if exists "auth insert posts" on public.posts;
create policy "auth insert posts" on public.posts
  for insert to authenticated
  with check (auth.uid() = user_id and verified_on_site = false);

drop policy if exists "auth insert reviews" on public.reviews;
create policy "auth insert reviews" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id and verified_on_site = false);

-- Geofence check after insert. Bypasses the admin-only UPDATE policy on purpose.
create or replace function public.confirm_on_site(
  p_post_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  post_row public.posts%rowtype;
begin
  select * into post_row from public.posts where id = p_post_id;
  if not found then
    return false;
  end if;
  if post_row.user_id is distinct from auth.uid() then
    return false;
  end if;
  if not public.is_within_market(post_row.market_id, p_lat, p_lng) then
    return false;
  end if;
  update public.posts
    set verified_on_site = true
    where id = p_post_id and user_id = auth.uid();
  return true;
end;
$$;

create or replace function public.confirm_review_on_site(
  p_review_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  review_row public.reviews%rowtype;
  on_site boolean := false;
begin
  select * into review_row from public.reviews where id = p_review_id;
  if not found then
    return false;
  end if;
  if review_row.user_id is distinct from auth.uid() then
    return false;
  end if;
  if review_row.market_id is not null then
    on_site := public.is_within_market(review_row.market_id, p_lat, p_lng);
  elsif review_row.vendor_id is not null then
    select exists (
      select 1
      from public.market_vendors mv
      where mv.vendor_id = review_row.vendor_id
        and public.is_within_market(mv.market_id, p_lat, p_lng)
    ) into on_site;
  end if;
  if not on_site then
    return false;
  end if;
  update public.reviews
    set verified_on_site = true
    where id = p_review_id and user_id = auth.uid();
  return true;
end;
$$;

revoke all on function public.confirm_on_site(uuid, double precision, double precision) from public;
revoke all on function public.confirm_review_on_site(uuid, double precision, double precision) from public;
grant execute on function public.confirm_on_site(uuid, double precision, double precision) to authenticated;
grant execute on function public.confirm_review_on_site(uuid, double precision, double precision) to authenticated;

-- Draft stall/menu rows should not leak. Anon policies must not read claimed_by
-- (that column is revoked from anon, and RLS on other tables would 42501).
drop policy if exists "market vendors readable" on public.market_vendors;
create policy "published market vendors readable" on public.market_vendors
  for select using (
    exists (
      select 1
      from public.markets m
      join public.vendors v on v.id = vendor_id
      where m.id = market_id
        and m.status = 'published'
        and v.status = 'published'
    )
  );

create policy "claimant or admin market vendors readable" on public.market_vendors
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.markets m
      where m.id = market_id and m.claimed_by = auth.uid()
    )
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.claimed_by = auth.uid()
    )
  );

drop policy if exists "menus readable" on public.vendor_menus;
create policy "published menus readable" on public.vendor_menus
  for select using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id and v.status = 'published'
    )
  );

create policy "claimant or admin menus readable" on public.vendor_menus
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.claimed_by = auth.uid()
    )
  );

-- PostGIS catalog table is in public and was writable by anon.
revoke all on table public.spatial_ref_sys from anon, authenticated, public;

alter function public.set_updated_at() set search_path = public;
alter function public.is_within_market(uuid, double precision, double precision) set search_path = public;
alter function public.nearby_markets(double precision, double precision, integer) set search_path = public;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
grant execute on function public.handle_new_user() to postgres, supabase_auth_admin, service_role;

-- Public Data API should not return operator email or claim ownership.
revoke select (email, claimed_by) on public.markets from anon;
revoke select (claimed_by) on public.vendors from anon;
