-- Public-release Data API harden: hide private columns, pin privilege
-- writes, own-row profile RPC, claim mail throttle, insert integrity.

-- ---------------------------------------------------------------------------
-- Ownership helpers (so RLS never needs SELECT on claimed_by)
-- ---------------------------------------------------------------------------
create or replace function public.owns_market(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.markets
    where id = p_id and claimed_by = auth.uid()
  );
$$;

create or replace function public.owns_vendor(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vendors
    where id = p_id and claimed_by = auth.uid()
  );
$$;

revoke all on function public.owns_market(uuid) from public, anon;
revoke all on function public.owns_vendor(uuid) from public, anon;
grant execute on function public.owns_market(uuid) to authenticated;
grant execute on function public.owns_vendor(uuid) to authenticated;

create or replace function public.my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- Service-role only stamps (JWT cannot UPDATE these columns).
create or replace function public.stamp_onboarded_at(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  stamped timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = p_user_id
    and username is not null
    and cardinality(favorite_market_slugs) = 3
  returning onboarded_at into stamped;
  return stamped;
end;
$$;

create or replace function public.stamp_visit_plan_emailed_at(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
  set visit_plan_emailed_at = now()
  where id = p_user_id
    and (
      visit_plan_emailed_at is null
      or visit_plan_emailed_at < now() - interval '10 minutes'
    );
  return found;
end;
$$;

revoke all on function public.stamp_onboarded_at(uuid) from public, anon, authenticated;
revoke all on function public.stamp_visit_plan_emailed_at(uuid) from public, anon, authenticated;
grant execute on function public.stamp_onboarded_at(uuid) to service_role;
grant execute on function public.stamp_visit_plan_emailed_at(uuid) to service_role;

-- Anon must not call is_admin(); split policies so published reads do not.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Pin privilege columns (JWT admin included; desk writes use service_role)
-- ---------------------------------------------------------------------------
create or replace function public.protect_market_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.featured is distinct from old.featured
    or new.claimed_by is distinct from old.claimed_by
    or new.slug is distinct from old.slug
    or new.lat is distinct from old.lat
    or new.lng is distinct from old.lng
    or new.geofence_radius_m is distinct from old.geofence_radius_m
    or new.review_count is distinct from old.review_count
    or new.rating_avg is distinct from old.rating_avg
  then
    raise exception 'listing privilege columns cannot be changed' using errcode = '42501';
  end if;
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
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.claimed_by is distinct from old.claimed_by
    or new.slug is distinct from old.slug
    or new.review_count is distinct from old.review_count
    or new.rating_avg is distinct from old.rating_avg
  then
    raise exception 'listing privilege columns cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role'
    and current_user not in ('postgres', 'supabase_admin')
  then
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed' using errcode = '42501';
    end if;
    if new.onboarded_at is distinct from old.onboarded_at
      or new.visit_plan_emailed_at is distinct from old.visit_plan_emailed_at
    then
      raise exception 'profile timestamps cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.role is distinct from 'user' then
      raise exception 'role cannot be set' using errcode = '42501';
    end if;
    if new.onboarded_at is not null or new.visit_plan_emailed_at is not null then
      raise exception 'profile timestamps cannot be set' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_insert on public.profiles;
create trigger protect_profile_insert
  before insert on public.profiles
  for each row
  execute function public.protect_profile_insert();

revoke all on function public.protect_profile_insert() from public, anon, authenticated;
revoke all on function public.protect_market_privilege_columns() from public, anon, authenticated;
revoke all on function public.protect_vendor_privilege_columns() from public, anon, authenticated;
revoke all on function public.protect_profile_role() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Post / review / claim insert integrity
-- ---------------------------------------------------------------------------
create or replace function public.guard_post_insert()
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
    if coalesce(cardinality(new.photos), 0) > 8 then
      raise exception 'Too many photos' using errcode = 'P0001';
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

create or replace function public.guard_claim_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.admin_note := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_claim_insert on public.claim_requests;
create trigger guard_claim_insert
  before insert on public.claim_requests
  for each row
  execute function public.guard_claim_insert();

revoke all on function public.guard_post_insert() from public, anon, authenticated;
revoke all on function public.guard_review_insert() from public, anon, authenticated;
revoke all on function public.guard_claim_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: anon never evaluates is_admin() or claimed_by on another table
-- ---------------------------------------------------------------------------
drop policy if exists "published markets readable" on public.markets;
create policy "published markets readable" on public.markets
  for select using (status = 'published');

drop policy if exists "claimant or admin markets readable" on public.markets;
create policy "claimant or admin markets readable" on public.markets
  for select to authenticated
  using (public.is_admin() or public.owns_market(id));

drop policy if exists "claimant update market" on public.markets;
create policy "claimant update market" on public.markets
  for update to authenticated
  using (public.owns_market(id))
  with check (public.owns_market(id));

drop policy if exists "published vendors readable" on public.vendors;
create policy "published vendors readable" on public.vendors
  for select using (status = 'published');

drop policy if exists "claimant or admin vendors readable" on public.vendors;
create policy "claimant or admin vendors readable" on public.vendors
  for select to authenticated
  using (public.is_admin() or public.owns_vendor(id));

drop policy if exists "claimant update vendor" on public.vendors;
create policy "claimant update vendor" on public.vendors
  for update to authenticated
  using (public.owns_vendor(id))
  with check (public.owns_vendor(id));

drop policy if exists "claimant or admin schedules readable" on public.market_schedules;
create policy "claimant or admin schedules readable" on public.market_schedules
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_market(market_id)
  );

drop policy if exists "claimant write schedules" on public.market_schedules;
create policy "claimant write schedules" on public.market_schedules
  for all to authenticated
  using (public.owns_market(market_id))
  with check (public.owns_market(market_id));

drop policy if exists "claimant or admin market vendors readable" on public.market_vendors;
create policy "claimant or admin market vendors readable" on public.market_vendors
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_market(market_id)
    or public.owns_vendor(vendor_id)
  );

drop policy if exists "claimant or admin menus readable" on public.vendor_menus;
create policy "claimant or admin menus readable" on public.vendor_menus
  for select to authenticated
  using (public.is_admin() or public.owns_vendor(vendor_id));

drop policy if exists "claimant write menus" on public.vendor_menus;
create policy "claimant write menus" on public.vendor_menus
  for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));

drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts
  for select using (flagged = false);

drop policy if exists "own or admin posts readable" on public.posts;
create policy "own or admin posts readable" on public.posts
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews
  for select using (flagged = false);

drop policy if exists "own or admin reviews readable" on public.reviews;
create policy "own or admin reviews readable" on public.reviews
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users read own claims" on public.claim_requests;
create policy "users read own claims" on public.claim_requests
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin write markets" on public.markets;
create policy "admin write markets" on public.markets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin write vendors" on public.vendors;
create policy "admin write vendors" on public.vendors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin write schedules" on public.market_schedules;
create policy "admin write schedules" on public.market_schedules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin write market vendors" on public.market_vendors;
create policy "admin write market vendors" on public.market_vendors
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin write menus" on public.vendor_menus;
create policy "admin write menus" on public.vendor_menus
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin update posts" on public.posts;
create policy "admin update posts" on public.posts
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin update reviews" on public.reviews;
create policy "admin update reviews" on public.reviews
  for update to authenticated
  using (public.is_admin());

drop policy if exists "admin update claims" on public.claim_requests;
create policy "admin update claims" on public.claim_requests
  for update to authenticated
  using (public.is_admin());

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts" on public.posts
  for delete to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- Column grants
-- ---------------------------------------------------------------------------
revoke all on table public.markets from public, anon, authenticated;
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
) on public.markets to anon, authenticated;
grant update (
  name,
  about,
  address,
  city,
  province,
  postal_code,
  website,
  instagram,
  tiktok,
  phone,
  email,
  logo_url,
  tags,
  updated_at
) on public.markets to authenticated;

revoke all on table public.vendors from public, anon, authenticated;
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
) on public.vendors to anon, authenticated;
grant update (
  name,
  about,
  website,
  instagram,
  tiktok,
  phone,
  logo_url,
  tags,
  updated_at
) on public.vendors to authenticated;

revoke all on table public.profiles from public, anon, authenticated;
grant select (id, display_name, avatar_url, username) on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, username, favorite_market_slugs, updated_at) on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, username, favorite_market_slugs, role) on public.profiles to authenticated;

revoke all on table public.posts from public, anon, authenticated;
grant select on table public.posts to anon, authenticated;
grant insert, delete on table public.posts to authenticated;

revoke all on table public.reviews from public, anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant insert on table public.reviews to authenticated;

revoke all on table public.claim_requests from public, anon, authenticated;
grant select, insert on table public.claim_requests to authenticated;

revoke all on table public.market_schedules from public, anon, authenticated;
grant select on table public.market_schedules to anon, authenticated;
grant insert, update, delete on table public.market_schedules to authenticated;

revoke all on table public.market_vendors from public, anon, authenticated;
grant select on table public.market_vendors to anon, authenticated;
grant insert, update, delete on table public.market_vendors to authenticated;

revoke all on table public.vendor_menus from public, anon, authenticated;
grant select on table public.vendor_menus to anon, authenticated;
grant insert, update, delete on table public.vendor_menus to authenticated;

-- ---------------------------------------------------------------------------
-- Claim mail throttle (no Data API access)
-- ---------------------------------------------------------------------------
create table if not exists public.mail_sends (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('claim')),
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists mail_sends_kind_key_created
  on public.mail_sends (kind, key_hash, created_at desc);

alter table public.mail_sends enable row level security;

revoke all on table public.mail_sends from public, anon, authenticated;
grant all on table public.mail_sends to postgres, service_role;
do $$
declare
  seq text := pg_get_serial_sequence('public.mail_sends', 'id');
begin
  if seq is not null then
    execute format('grant usage, select on sequence %s to service_role', seq);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: hosted bucket MIME + size (config.toml is local-only)
-- ---------------------------------------------------------------------------
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'post-photos';
