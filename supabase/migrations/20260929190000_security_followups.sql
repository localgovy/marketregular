-- Repair the dead profile-role guard, stop anonymous profile enumeration,
-- and close unused write paths left after removing on-site verification.

-- ---------------------------------------------------------------------------
-- protect_profile_role checked current_user inside a security definer
-- function, which is always the owner (postgres), so the guard never fired.
-- session_user stays the connecting role. Stampers set a transaction-local
-- bypass so onboarding and visit-plan mail can still write those columns.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role'
    and session_user not in ('postgres', 'supabase_admin')
    and coalesce(current_setting('app.profile_guard_bypass', true), '') <> 'on'
  then
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed' using errcode = '42501';
    end if;
    if new.onboarded_at is distinct from old.onboarded_at
      or new.visit_plan_emailed_at is distinct from old.visit_plan_emailed_at then
      raise exception 'profile timestamps cannot be changed' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

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
  perform set_config('app.profile_guard_bypass', 'on', true);
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

create or replace function public.stamp_onboarded_at(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  stamped timestamptz;
begin
  if auth.role() is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform set_config('app.profile_guard_bypass', 'on', true);
  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = p_user_id
    and username is not null
    and cardinality(favorite_market_slugs) = 3
  returning onboarded_at into stamped;
  return stamped;
end;
$$;

revoke all on function public.stamp_onboarded_at(uuid) from public, anon, authenticated;
grant execute on function public.stamp_onboarded_at(uuid) to service_role;

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
  perform set_config('app.profile_guard_bypass', 'on', true);
  update public.profiles
  set visit_plan_emailed_at = now()
  where id = p_user_id
    and (
      visit_plan_emailed_at is null
      or visit_plan_emailed_at < now() - interval '1 hour'
    );
  return found;
end;
$$;

revoke all on function public.stamp_visit_plan_emailed_at(uuid) from public, anon, authenticated;
grant execute on function public.stamp_visit_plan_emailed_at(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Profiles: authors of a public post or review, plus the signed-in person.
-- New accounts no longer default the public name to the email local-part.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles are readable" on public.profiles;

create policy "authors and self readable" on public.profiles
  for select
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.posts p
      join public.markets m on m.id = p.market_id
      where p.user_id = profiles.id
        and p.flagged = false
        and m.status = 'published'
    )
    or exists (
      select 1
      from public.reviews r
      where r.user_id = profiles.id
        and r.flagged = false
        and (
          exists (
            select 1 from public.markets m
            where m.id = r.market_id and m.status = 'published'
          )
          or exists (
            select 1 from public.vendors v
            where v.id = r.vendor_id and v.status = 'published'
          )
        )
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      'Regular'
    ), 80),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    ),
    'user'
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, supabase_auth_admin, service_role;

update public.profiles
set display_name = left(display_name, 80)
where display_name is not null
  and char_length(display_name) > 80;

alter table public.profiles
  drop constraint if exists profiles_display_name_len;

alter table public.profiles
  add constraint profiles_display_name_len
  check (display_name is null or char_length(display_name) <= 80);

-- ---------------------------------------------------------------------------
-- No client uploader. Service role still deletes objects on account removal.
-- ---------------------------------------------------------------------------
drop policy if exists "auth upload post photos" on storage.objects;
drop policy if exists "auth delete own post photos" on storage.objects;

-- On-site verification and unused geo RPCs.
drop function if exists public.confirm_on_site(uuid, double precision, double precision);
drop function if exists public.is_within_market(uuid, double precision, double precision);
drop function if exists public.nearby_markets(double precision, double precision, integer);

-- ---------------------------------------------------------------------------
-- Guest claims get a per-IP budget that does not change when the email does.
-- A failed send gives the slot back.
-- ---------------------------------------------------------------------------
alter table public.mail_sends
  drop constraint if exists mail_sends_kind_check;

alter table public.mail_sends
  add constraint mail_sends_kind_check check (kind in ('claim', 'claim_ip', 'visit'));

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
  if p_kind not in ('claim', 'claim_ip', 'visit') then
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

create or replace function public.release_mail_slot(
  p_kind text,
  p_keys text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('claim', 'claim_ip', 'visit') then
    return;
  end if;
  if p_keys is null or cardinality(p_keys) = 0 then
    return;
  end if;

  delete from public.mail_sends m
  using unnest(p_keys) as k(key_hash)
  where m.id = (
    select id
    from public.mail_sends
    where kind = p_kind
      and key_hash = k.key_hash
      and created_at > now() - interval '5 minutes'
    order by created_at desc
    limit 1
  );
end;
$$;

revoke all on function public.release_mail_slot(text, text[])
  from public, anon, authenticated;
grant execute on function public.release_mail_slot(text, text[])
  to service_role;
