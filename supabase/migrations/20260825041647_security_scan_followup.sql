-- Follow-up harden: Data API writes the Next actions already filtered,
-- mail slots, flagged-post resurrection, JWT admin write surface.

-- ---------------------------------------------------------------------------
-- Atomic mail slot (service_role only). Replaces SELECT-then-INSERT.
-- ---------------------------------------------------------------------------
create or replace function public.take_mail_slot(
  p_kind text,
  p_keys text[],
  p_hour_limit integer,
  p_day_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  hour_count integer;
  day_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('claim', 'visit') then
    return false;
  end if;
  if p_keys is null or cardinality(p_keys) = 0 then
    return false;
  end if;
  if p_hour_limit < 1 or p_day_limit < 1 then
    return false;
  end if;

  for k in
    select x from unnest(p_keys) as x order by 1
  loop
    perform pg_advisory_xact_lock(881122, hashtext(p_kind || ':' || k));
    select count(*) into hour_count
    from public.mail_sends
    where kind = p_kind
      and key_hash = k
      and created_at >= now() - interval '1 hour';
    if hour_count >= p_hour_limit then
      return false;
    end if;
    select count(*) into day_count
    from public.mail_sends
    where kind = p_kind
      and key_hash = k
      and created_at >= now() - interval '24 hours';
    if day_count >= p_day_limit then
      return false;
    end if;
  end loop;

  insert into public.mail_sends (kind, key_hash)
  select p_kind, unnest(p_keys);
  return true;
end;
$$;

revoke all on function public.take_mail_slot(text, text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.take_mail_slot(text, text[], integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Posts: photo URL prefix, no flagged-body replay
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

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own unflagged posts" on public.posts
  for delete to authenticated
  using (auth.uid() = user_id and flagged = false);

-- ---------------------------------------------------------------------------
-- Claims: real listing, evidence cap, per-user rate
-- ---------------------------------------------------------------------------
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
    if char_length(coalesce(new.evidence, '')) > 8000 then
      raise exception 'Evidence is too long' using errcode = 'P0001';
    end if;
    if new.target_type = 'market' then
      if not exists (
        select 1 from public.markets
        where id = new.target_id and status = 'published'
      ) then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
    elsif new.target_type = 'vendor' then
      if not exists (
        select 1 from public.vendors
        where id = new.target_id and status = 'published'
      ) then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
    else
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.claim_requests
      where user_id = new.user_id
        and created_at >= now() - interval '1 hour'
    ) >= 3 then
      raise exception 'Wait a bit before sending another claim.' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.claim_requests
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Wait a bit before sending another claim.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Usernames, HTTPS urls, save cap
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is not null
    and lower(new.username) in (
      'admin', 'api', 'help', 'localgovy', 'marketregular', 'support', 'www'
    )
  then
    raise exception 'That handle is reserved' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_username on public.profiles;
create trigger guard_profile_username
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_username();

revoke all on function public.guard_profile_username() from public, anon, authenticated;

create or replace function public.guard_https_asset_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'profiles' then
    if new.avatar_url is not null
      and (
        new.avatar_url !~* '^https://'
        or new.avatar_url ~* '^(javascript:|data:)'
        or char_length(new.avatar_url) > 2048
      )
    then
      raise exception 'Avatar URL is not allowed' using errcode = 'P0001';
    end if;
  else
    if new.logo_url is not null
      and (
        new.logo_url !~* '^https://'
        or new.logo_url ~* '^(javascript:|data:)'
        or char_length(new.logo_url) > 2048
      )
    then
      raise exception 'Logo URL is not allowed' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_avatar_url on public.profiles;
create trigger guard_profile_avatar_url
  before insert or update on public.profiles
  for each row
  execute function public.guard_https_asset_url();

drop trigger if exists guard_market_logo_url on public.markets;
create trigger guard_market_logo_url
  before insert or update on public.markets
  for each row
  execute function public.guard_https_asset_url();

drop trigger if exists guard_vendor_logo_url on public.vendors;
create trigger guard_vendor_logo_url
  before insert or update on public.vendors
  for each row
  execute function public.guard_https_asset_url();

revoke all on function public.guard_https_asset_url() from public, anon, authenticated;

create or replace function public.guard_save_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.saves where user_id = new.user_id
  ) >= 200 then
    raise exception 'Save list is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_save_insert on public.saves;
create trigger guard_save_insert
  before insert on public.saves
  for each row
  execute function public.guard_save_insert();

revoke all on function public.guard_save_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Desk uses service_role. JWT admin must not write via the Data API.
-- ---------------------------------------------------------------------------
drop policy if exists "admin write markets" on public.markets;
drop policy if exists "admin write vendors" on public.vendors;
drop policy if exists "admin write schedules" on public.market_schedules;
drop policy if exists "admin write market vendors" on public.market_vendors;
drop policy if exists "admin write menus" on public.vendor_menus;
drop policy if exists "admin update profiles" on public.profiles;
drop policy if exists "admin update posts" on public.posts;
drop policy if exists "admin update reviews" on public.reviews;
drop policy if exists "admin update claims" on public.claim_requests;

-- ---------------------------------------------------------------------------
-- Grants: census is select-only. Profile role on INSERT is still
-- overwritten/rejected by protect_profile_insert (must be 'user').
-- ---------------------------------------------------------------------------
revoke all on table public.profiles from public, anon, authenticated;
grant select (id, display_name, avatar_url, username) on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, username, favorite_market_slugs, updated_at)
  on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, username, favorite_market_slugs, role)
  on public.profiles to authenticated;

revoke all on table public.directory_census from public, anon, authenticated;
grant select (id, markets, vendors, menus, tallied_at)
  on public.directory_census to anon, authenticated;

-- ---------------------------------------------------------------------------
-- listing-marks: same MIME/size pin as post-photos
-- ---------------------------------------------------------------------------
update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'listing-marks';

-- Hosted API may still list graphql_public; deny Data API roles at the schema.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'graphql_public') then
    execute 'revoke all on schema graphql_public from public, anon, authenticated';
  end if;
exception
  when insufficient_privilege then
    raise notice 'graphql_public revoke skipped';
end;
$$;
