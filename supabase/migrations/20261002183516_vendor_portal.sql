-- Stall owners edit their own listing through security-definer RPCs.
-- Directory tables stay revoked from anon and authenticated. Each function
-- checks auth.uid() and owns_vendor, and only writes the columns an owner
-- is allowed to change. Slug, status, claimed_by, and review stats stay
-- behind protect_vendor_privilege_columns.

create or replace function public.portal_tags(p_tags text[], p_cap integer)
returns text[]
language plpgsql
stable
set search_path = public
as $fn$
declare
  raw text;
  cleaned text;
  out text[] := '{}';
begin
  if p_tags is null then
    return '{}';
  end if;
  foreach raw in array p_tags loop
    cleaned := lower(btrim(coalesce(raw, '')));
    cleaned := regexp_replace(cleaned, '[[:space:]]+', '-', 'g');
    if cleaned = '' then
      continue;
    end if;
    if char_length(cleaned) > 40 or cleaned !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'That tag is not allowed' using errcode = 'P0001';
    end if;
    if not cleaned = any (out) then
      out := array_append(out, cleaned);
    end if;
    if cardinality(out) > p_cap then
      raise exception 'Too many tags' using errcode = 'P0001';
    end if;
  end loop;
  return out;
end;
$fn$;

revoke all on function public.portal_tags(text[], integer) from public, anon, authenticated;

create or replace function public.has_owned_vendor()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and exists (
      select 1
      from public.vendors
      where claimed_by = auth.uid()
    );
$fn$;

create or replace function public.my_vendor_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(owned.vendor_row order by owned.vendor_row->>'name'),
    '[]'::jsonb
  )
  into result
  from (
    select jsonb_build_object(
      'id', v.id,
      'slug', v.slug,
      'name', v.name,
      'about', v.about,
      'website', v.website,
      'instagram', v.instagram,
      'tiktok', v.tiktok,
      'facebook', v.facebook,
      'phone', v.phone,
      'email', v.email,
      'logo_url', v.logo_url,
      'tags', coalesce(v.tags, '{}'::text[]),
      'status', v.status,
      'menus', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'description', m.description,
            'price_cents', m.price_cents,
            'season', m.season,
            'dietary', coalesce(m.dietary, '{}'::text[])
          )
          order by m.name, m.id
        )
        from public.vendor_menus m
        where m.vendor_id = v.id
      ), '[]'::jsonb),
      'stalls', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'market_id', mv.market_id,
            'market_name', mk.name,
            'market_slug', mk.slug,
            'market_city', mk.city,
            'stall', mv.stall,
            'days', coalesce(mv.days, '{}'::smallint[]),
            'open_days', coalesce((
              select array_agg(distinct ms.weekday order by ms.weekday)
              from public.market_schedules ms
              where ms.market_id = mk.id
            ), '{}'::smallint[]),
            'hours', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'weekday', ms.weekday,
                  'opens_at', to_char(ms.opens_at, 'HH24:MI'),
                  'closes_at', to_char(ms.closes_at, 'HH24:MI')
                )
                order by ms.weekday, ms.opens_at
              )
              from public.market_schedules ms
              where ms.market_id = mk.id
            ), '[]'::jsonb)
          )
          order by mk.name
        )
        from public.market_vendors mv
        join public.markets mk on mk.id = mv.market_id
        where mv.vendor_id = v.id
      ), '[]'::jsonb)
    ) as vendor_row
    from public.vendors v
    where v.claimed_by = auth.uid()
  ) owned;

  return result;
end;
$fn$;

create or replace function public.save_owned_vendor(
  p_id uuid,
  p_name text,
  p_about text,
  p_website text,
  p_instagram text,
  p_tiktok text,
  p_facebook text,
  p_phone text,
  p_email text,
  p_tags text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_about text;
  v_website text;
  v_instagram text;
  v_tiktok text;
  v_facebook text;
  v_phone text;
  v_email text;
  v_tags text[];
begin
  if auth.uid() is null or not public.owns_vendor(p_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Add a name' using errcode = 'P0001';
  end if;

  v_about := nullif(btrim(coalesce(p_about, '')), '');
  if v_about is not null and char_length(v_about) > 4000 then
    raise exception 'Keep the about shorter' using errcode = 'P0001';
  end if;

  v_website := nullif(btrim(coalesce(p_website, '')), '');
  v_instagram := nullif(btrim(coalesce(p_instagram, '')), '');
  v_tiktok := nullif(btrim(coalesce(p_tiktok, '')), '');
  v_facebook := nullif(btrim(coalesce(p_facebook, '')), '');
  if char_length(coalesce(v_website, '')) > 2048
    or char_length(coalesce(v_instagram, '')) > 2048
    or char_length(coalesce(v_tiktok, '')) > 2048
    or char_length(coalesce(v_facebook, '')) > 2048
  then
    raise exception 'Listing URL is not allowed' using errcode = 'P0001';
  end if;

  v_phone := nullif(btrim(coalesce(p_phone, '')), '');
  if v_phone is not null and (
    char_length(v_phone) > 40
    or v_phone !~ '^[0-9+().[:space:]-]+$'
    or v_phone !~ '[0-9]'
  ) then
    raise exception 'That phone number is not allowed' using errcode = 'P0001';
  end if;

  v_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  if v_email is not null and (
    char_length(v_email) > 120
    or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ) then
    raise exception 'That email is not allowed' using errcode = 'P0001';
  end if;

  v_tags := public.portal_tags(p_tags, 24);

  update public.vendors
  set
    name = v_name,
    about = v_about,
    website = v_website,
    instagram = v_instagram,
    tiktok = v_tiktok,
    facebook = v_facebook,
    phone = v_phone,
    email = v_email,
    tags = v_tags
  where id = p_id
    and claimed_by = auth.uid();

  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$fn$;

create or replace function public.save_owned_menu_item(
  p_vendor_id uuid,
  p_item_id uuid,
  p_name text,
  p_description text,
  p_price_cents integer,
  p_season text,
  p_dietary text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_description text;
  v_season text;
  v_dietary text[];
  v_id uuid;
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 160 then
    raise exception 'Add an item name' using errcode = 'P0001';
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');
  if v_description is not null and char_length(v_description) > 2000 then
    raise exception 'Keep the description shorter' using errcode = 'P0001';
  end if;

  if p_price_cents is not null and (p_price_cents < 0 or p_price_cents > 1000000) then
    raise exception 'That price is not allowed' using errcode = 'P0001';
  end if;

  v_season := nullif(btrim(coalesce(p_season, '')), '');
  if v_season is not null and char_length(v_season) > 120 then
    raise exception 'Keep the season shorter' using errcode = 'P0001';
  end if;

  v_dietary := public.portal_tags(p_dietary, 12);

  if p_item_id is null then
    if (
      select count(*) from public.vendor_menus where vendor_id = p_vendor_id
    ) >= 80 then
      raise exception 'Menu is full' using errcode = 'P0001';
    end if;
    insert into public.vendor_menus (
      vendor_id, name, description, price_cents, season, dietary
    )
    values (
      p_vendor_id, v_name, v_description, p_price_cents, v_season, v_dietary
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.vendor_menus
  set
    name = v_name,
    description = v_description,
    price_cents = p_price_cents,
    season = v_season,
    dietary = v_dietary
  where id = p_item_id
    and vendor_id = p_vendor_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is missing' using errcode = 'P0001';
  end if;
  return v_id;
end;
$fn$;

create or replace function public.delete_owned_menu_item(p_vendor_id uuid, p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.vendor_menus
  where id = p_item_id
    and vendor_id = p_vendor_id;

  if not found then
    raise exception 'That item is missing' using errcode = 'P0001';
  end if;
end;
$fn$;

create or replace function public.save_owned_stall(
  p_vendor_id uuid,
  p_market_id uuid,
  p_stall text,
  p_days smallint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_stall text;
  v_days smallint[];
  v_open smallint[];
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.markets
    where id = p_market_id
      and status = 'published'
  ) then
    raise exception 'That market is missing' using errcode = 'P0001';
  end if;

  v_stall := nullif(btrim(coalesce(p_stall, '')), '');
  if v_stall is not null and char_length(v_stall) > 80 then
    raise exception 'Keep the stall label shorter' using errcode = 'P0001';
  end if;

  if p_days is null or cardinality(p_days) = 0 then
    raise exception 'Pick at least one day the market is open' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_days) as d
    where d is null or d < 0 or d > 6
  ) then
    raise exception 'Pick days the market is open' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct d order by d), '{}'::smallint[])
  into v_days
  from unnest(p_days) as d;

  select coalesce(array_agg(distinct weekday order by weekday), '{}'::smallint[])
  into v_open
  from public.market_schedules
  where market_id = p_market_id;

  if cardinality(v_open) = 0 then
    raise exception 'That market has no hours yet' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(v_days) as d
    where not (d = any (v_open))
  ) then
    raise exception 'Pick days the market is open' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.market_vendors
    where market_id = p_market_id
      and vendor_id = p_vendor_id
  ) and (
    select count(*) from public.market_vendors where vendor_id = p_vendor_id
  ) >= 40 then
    raise exception 'Stall list is full' using errcode = 'P0001';
  end if;

  insert into public.market_vendors (market_id, vendor_id, stall, days)
  values (p_market_id, p_vendor_id, v_stall, v_days)
  on conflict (market_id, vendor_id) do update
  set stall = excluded.stall,
      days = excluded.days;
end;
$fn$;

create or replace function public.delete_owned_stall(p_vendor_id uuid, p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  delete from public.market_vendors
  where market_id = p_market_id
    and vendor_id = p_vendor_id;

  if not found then
    raise exception 'That market is missing' using errcode = 'P0001';
  end if;
end;
$fn$;

revoke all on function public.has_owned_vendor() from public, anon;
grant execute on function public.has_owned_vendor() to authenticated;

revoke all on function public.my_vendor_portal() from public, anon;
grant execute on function public.my_vendor_portal() to authenticated;

revoke all on function public.save_owned_vendor(uuid, text, text, text, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.save_owned_vendor(uuid, text, text, text, text, text, text, text, text, text[]) to authenticated;

revoke all on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[]) from public, anon;
grant execute on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[]) to authenticated;

revoke all on function public.delete_owned_menu_item(uuid, uuid) from public, anon;
grant execute on function public.delete_owned_menu_item(uuid, uuid) to authenticated;

revoke all on function public.save_owned_stall(uuid, uuid, text, smallint[]) from public, anon;
grant execute on function public.save_owned_stall(uuid, uuid, text, smallint[]) to authenticated;

revoke all on function public.delete_owned_stall(uuid, uuid) from public, anon;
grant execute on function public.delete_owned_stall(uuid, uuid) to authenticated;

-- PostgREST pre-request rejects every RPC that is not named here.
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
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|directory_census|markets|vendors)(/|$)'
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
