-- Data API lockdown after the 2026-08-29 scan.
--
-- Root cause of the research_notes leak: table-level GRANT SELECT/INSERT/UPDATE
-- on market_schedules (and the other public write tables). ADD COLUMN inherits
-- those grants, so a desk-only column became readable to anon the moment it
-- existed. Pin every public table to the columns that are meant to be there.
-- New columns stay private until a later migration names them.

-- ---------------------------------------------------------------------------
-- Schedules: research_notes is desk-only
-- ---------------------------------------------------------------------------
revoke all on table public.market_schedules from public, anon, authenticated;
grant select (
  id,
  market_id,
  weekday,
  opens_at,
  closes_at,
  season_start,
  season_end,
  notes
) on public.market_schedules to anon, authenticated;
grant insert (
  market_id,
  weekday,
  opens_at,
  closes_at,
  season_start,
  season_end,
  notes
) on public.market_schedules to authenticated;
grant update (
  market_id,
  weekday,
  opens_at,
  closes_at,
  season_start,
  season_end,
  notes
) on public.market_schedules to authenticated;
grant delete on table public.market_schedules to authenticated;

-- ---------------------------------------------------------------------------
-- Posts / reviews / claims / menus / roster / saves / profiles
-- ---------------------------------------------------------------------------
revoke all on table public.posts from public, anon, authenticated;
grant select (
  id,
  user_id,
  market_id,
  body,
  photos,
  verified_on_site,
  flagged,
  created_at
) on public.posts to anon, authenticated;
grant insert (user_id, market_id, body, photos, verified_on_site)
  on public.posts to authenticated;
grant delete on table public.posts to authenticated;

revoke all on table public.reviews from public, anon, authenticated;
grant select (
  id,
  user_id,
  market_id,
  vendor_id,
  rating,
  body,
  verified_on_site,
  flagged,
  created_at
) on public.reviews to anon, authenticated;
grant insert (user_id, market_id, vendor_id, rating, body, verified_on_site)
  on public.reviews to authenticated;

revoke all on table public.claim_requests from public, anon, authenticated;
grant select (
  id,
  user_id,
  target_type,
  target_id,
  evidence,
  status,
  admin_note,
  created_at,
  updated_at
) on public.claim_requests to authenticated;
grant insert (user_id, target_type, target_id, evidence)
  on public.claim_requests to authenticated;

revoke all on table public.vendor_menus from public, anon, authenticated;
grant select (
  id,
  vendor_id,
  name,
  description,
  price_cents,
  season,
  dietary
) on public.vendor_menus to anon, authenticated;
grant insert (vendor_id, name, description, price_cents, season, dietary)
  on public.vendor_menus to authenticated;
grant update (vendor_id, name, description, price_cents, season, dietary)
  on public.vendor_menus to authenticated;
grant delete on table public.vendor_menus to authenticated;

-- JWT has no write policy on market_vendors; stop granting writes that RLS denies.
revoke all on table public.market_vendors from public, anon, authenticated;
grant select (market_id, vendor_id, stall, days)
  on public.market_vendors to anon, authenticated;

revoke all on table public.saves from public, anon, authenticated;
grant select (user_id, kind, slug, created_at) on public.saves to authenticated;
grant insert (user_id, kind, slug) on public.saves to authenticated;
grant delete on table public.saves to authenticated;

revoke all on table public.profiles from public, anon, authenticated;
grant select (id, display_name, avatar_url, username)
  on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, username, favorite_market_slugs, updated_at)
  on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, username, favorite_market_slugs)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Insert integrity: published listings only
-- ---------------------------------------------------------------------------
create or replace function public.guard_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo text;
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id := auth.uid();
    new.verified_on_site := false;
    new.flagged := false;
    new.created_at := now();
    if not exists (
      select 1 from public.markets
      where id = new.market_id and status = 'published'
    ) then
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if coalesce(cardinality(new.photos), 0) > 8 then
      raise exception 'Too many photos' using errcode = 'P0001';
    end if;
    if new.photos is not null then
      foreach photo in array new.photos
      loop
        if photo is null
          or char_length(photo) > 2048
          or photo ~ '\.\.|\\|#'
          or photo !~* (
            '^https://[a-z0-9-]+\.supabase\.(co|in)/storage/v1/object/public/post-photos/'
            || new.user_id::text
            || '/'
          )
        then
          raise exception 'Photo URL is not allowed' using errcode = 'P0001';
        end if;
      end loop;
    end if;
    if exists (
      select 1
      from public.posts p
      where p.user_id = new.user_id
        and p.flagged = true
        and md5(lower(trim(p.body))) = md5(lower(trim(new.body)))
        and p.created_at >= now() - interval '90 days'
    ) then
      raise exception 'This post was removed' using errcode = 'P0001';
    end if;
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
    new.user_id := auth.uid();
    new.verified_on_site := false;
    new.flagged := false;
    new.created_at := now();
    if new.market_id is not null and not exists (
      select 1 from public.markets
      where id = new.market_id and status = 'published'
    ) then
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if new.vendor_id is not null and not exists (
      select 1 from public.vendors
      where id = new.vendor_id and status = 'published'
    ) then
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.reviews
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Daily review limit reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_post_insert() from public, anon, authenticated;
revoke all on function public.guard_review_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Listing hrefs: no javascript:/data: stored for claimants to serve
-- ---------------------------------------------------------------------------
create or replace function public.listing_href_ok(value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    value is null
    or (
      char_length(value) <= 2048
      and value !~* '(javascript|data|vbscript):'
      and (
        value ~* '^https?://'
        or value !~* '^[a-z][a-z0-9+.-]*:'
      )
    );
$$;

revoke all on function public.listing_href_ok(text) from public, anon, authenticated;

create or replace function public.guard_listing_hrefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.listing_href_ok(new.website)
    or not public.listing_href_ok(new.instagram)
    or not public.listing_href_ok(new.tiktok)
    or not public.listing_href_ok(new.facebook)
  then
    raise exception 'Listing URL is not allowed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_listing_hrefs on public.markets;
create trigger guard_listing_hrefs
  before insert or update on public.markets
  for each row
  execute function public.guard_listing_hrefs();

drop trigger if exists guard_listing_hrefs on public.vendors;
create trigger guard_listing_hrefs
  before insert or update on public.vendors
  for each row
  execute function public.guard_listing_hrefs();

revoke all on function public.guard_listing_hrefs() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding stamp: JWT has no user-id argument (cannot stamp someone else)
-- ---------------------------------------------------------------------------
create or replace function public.stamp_onboarded_at()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  stamped timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid()
    and username is not null
    and cardinality(favorite_market_slugs) = 3
  returning onboarded_at into stamped;
  return stamped;
end;
$$;

revoke all on function public.stamp_onboarded_at() from public, anon;
grant execute on function public.stamp_onboarded_at() to authenticated;

revoke all on function public.stamp_onboarded_at(uuid) from public, anon, authenticated;
grant execute on function public.stamp_onboarded_at(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- mail_sends: RLS on, no client policies — add an explicit deny so the linter
-- is not the only record of that choice.
-- ---------------------------------------------------------------------------
drop policy if exists "no client access" on public.mail_sends;
create policy "no client access" on public.mail_sends
  for all to anon, authenticated
  using (false)
  with check (false);

-- PostGIS objects are owned by supabase_admin. postgres can issue REVOKE
-- here; it is a no-op on ACLs supabase_admin granted. Writes are already
-- blocked by reject_spatial_ref_sys_writes. Do not move PostGIS out of
-- public — geography columns on markets depend on it.
-- ---------------------------------------------------------------------------
revoke all on function public.st_estimatedextent(text, text)
  from public, anon, authenticated;
revoke all on function public.st_estimatedextent(text, text, text)
  from public, anon, authenticated;
revoke all on function public.st_estimatedextent(text, text, text, boolean)
  from public, anon, authenticated;

do $$
begin
  execute 'revoke all on table public.geography_columns from public, anon, authenticated';
  execute 'revoke all on table public.geometry_columns from public, anon, authenticated';
exception
  when insufficient_privilege then
    raise notice 'postgis catalog view revoke skipped';
end;
$$;

do $$
begin
  set local role supabase_admin;
  revoke all on table public.spatial_ref_sys from public, anon, authenticated;
  execute 'revoke all on table public.geography_columns from public, anon, authenticated';
  execute 'revoke all on table public.geometry_columns from public, anon, authenticated';
exception
  when insufficient_privilege then
    raise notice 'supabase_admin catalog revoke skipped';
end;
$$;
