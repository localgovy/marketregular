-- Market owners edit their listing through security-definer RPCs.
-- Directory tables stay revoked from anon and authenticated. A market claim
-- still does not set profiles.role. Stalls a market adds stay unclaimed
-- until the person who runs them claims the vendor listing.

alter table public.vendors
  add column if not exists created_by_market_id uuid references public.markets (id) on delete set null;

create index if not exists vendors_created_by_market_idx
  on public.vendors (created_by_market_id);

comment on column public.vendors.created_by_market_id is
  'Set when a market owner creates the stall. Profile edits stay open only while claimed_by is null.';

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
    or new.selling_approved is distinct from old.selling_approved
    or new.created_by_market_id is distinct from old.created_by_market_id
  then
    raise exception 'listing privilege columns cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_vendor_privilege_columns() from public, anon, authenticated;

create or replace function public.owns_market(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.password_change_pending()
    and exists (
      select 1
      from public.markets
      where id = p_id
        and claimed_by = auth.uid()
    );
$$;

revoke all on function public.owns_market(uuid) from public, anon;
grant execute on function public.owns_market(uuid) to authenticated;

create or replace function public.has_owned_market()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and exists (
      select 1
      from public.markets
      where claimed_by = auth.uid()
    );
$fn$;

create or replace function public.awaiting_market_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.markets where claimed_by = auth.uid()
      )
      or exists (
        select 1
        from public.claim_requests
        where user_id = auth.uid()
          and target_type = 'market'
          and status = 'pending'
      )
    );
$fn$;

create or replace function public.portal_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $fn$
declare
  v_phone text;
begin
  v_phone := nullif(btrim(coalesce(p_phone, '')), '');
  if v_phone is not null and (
    char_length(v_phone) > 40
    or v_phone !~ '^[0-9+().[:space:].-]+$'
    or v_phone !~ '[0-9]'
  ) then
    raise exception 'That phone number is not allowed' using errcode = 'P0001';
  end if;
  return v_phone;
end;
$fn$;

create or replace function public.portal_email(p_email text)
returns text
language plpgsql
immutable
set search_path = public
as $fn$
declare
  v_email text;
begin
  v_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  if v_email is not null and (
    char_length(v_email) > 120
    or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ) then
    raise exception 'That email is not allowed' using errcode = 'P0001';
  end if;
  return v_email;
end;
$fn$;

create or replace function public.portal_open_days(p_market_id uuid, p_days smallint[])
returns smallint[]
language plpgsql
stable
set search_path = public
as $fn$
declare
  v_days smallint[];
  v_open smallint[];
begin
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
  return v_days;
end;
$fn$;

create or replace function public.portal_vendor_slug(p_name text)
returns text
language plpgsql
volatile
set search_path = public
as $fn$
declare
  v_slug text;
  v_candidate text;
  v_n integer;
begin
  v_slug := lower(btrim(coalesce(p_name, '')));
  v_slug := replace(v_slug, 'œ', 'oe');
  v_slug := replace(v_slug, 'æ', 'ae');
  v_slug := translate(
    v_slug,
    'àáâãäåāèéêëēìíîïīòóôõöōùúûüūýÿñç',
    'aaaaaaaeeeeeiiiiioooooouuuuuyync'
  );
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_slug := left(v_slug, 72);
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'That name needs letters or numbers' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('market-vendor-slug'), hashtext(v_slug));
  v_candidate := v_slug;
  v_n := 2;
  while exists (select 1 from public.vendors where slug = v_candidate) loop
    v_candidate := v_slug || '-' || v_n::text;
    v_n := v_n + 1;
    if v_n > 100 then
      raise exception 'That stall is already listed. Add it from search' using errcode = 'P0001';
    end if;
  end loop;
  return v_candidate;
end;
$fn$;

revoke all on function public.portal_phone(text) from public, anon, authenticated;
revoke all on function public.portal_email(text) from public, anon, authenticated;
revoke all on function public.portal_open_days(uuid, smallint[]) from public, anon, authenticated;
revoke all on function public.portal_vendor_slug(text) from public, anon, authenticated;

create or replace function public.my_market_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  result jsonb;
begin
  if auth.uid() is null or public.password_change_pending() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(owned.market_row order by owned.market_row->>'name'),
    '[]'::jsonb
  )
  into result
  from (
    select jsonb_build_object(
      'id', m.id,
      'slug', m.slug,
      'name', m.name,
      'about', m.about,
      'address', m.address,
      'city', m.city,
      'province', m.province,
      'postal_code', m.postal_code,
      'website', m.website,
      'instagram', m.instagram,
      'tiktok', m.tiktok,
      'facebook', m.facebook,
      'phone', m.phone,
      'email', m.email,
      'logo_url', m.logo_url,
      'tags', coalesce(m.tags, '{}'::text[]),
      'status', m.status,
      'created_count', (
        select count(*)::integer
        from public.vendors created
        where created.created_by_market_id = m.id
      ),
      'schedules', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', ms.id,
            'weekday', ms.weekday,
            'opens_at', to_char(ms.opens_at, 'HH24:MI'),
            'closes_at', to_char(ms.closes_at, 'HH24:MI'),
            'season_start', ms.season_start,
            'season_end', ms.season_end,
            'notes', ms.notes
          )
          order by ms.weekday, ms.opens_at, ms.id
        )
        from public.market_schedules ms
        where ms.market_id = m.id
      ), '[]'::jsonb),
      'stalls', coalesce((
        select jsonb_agg(stall.stall_row order by stall.stall_row->>'vendor_name')
        from (
          select
            jsonb_build_object(
              'vendor_id', v.id,
              'vendor_name', v.name,
              'vendor_slug', v.slug,
              'stall', mv.stall,
              'days', coalesce(mv.days, '{}'::smallint[]),
              'claimed', v.claimed_by is not null,
              'created_here', v.created_by_market_id = m.id,
              'editable', v.created_by_market_id = m.id and v.claimed_by is null
            )
            || case
              when v.created_by_market_id = m.id and v.claimed_by is null then
                jsonb_build_object(
                  'about', v.about,
                  'website', v.website,
                  'instagram', v.instagram,
                  'tiktok', v.tiktok,
                  'facebook', v.facebook,
                  'phone', v.phone,
                  'email', v.email,
                  'logo_url', v.logo_url,
                  'tags', coalesce(v.tags, '{}'::text[])
                )
              else '{}'::jsonb
            end as stall_row
          from public.market_vendors mv
          join public.vendors v on v.id = mv.vendor_id
          where mv.market_id = m.id
        ) stall
      ), '[]'::jsonb)
    ) as market_row
    from public.markets m
    where m.claimed_by = auth.uid()
  ) owned;

  return result;
end;
$fn$;

create or replace function public.save_owned_market(
  p_id uuid,
  p_name text,
  p_about text,
  p_address text,
  p_city text,
  p_province text,
  p_postal_code text,
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
  v_address text;
  v_city text;
  v_province text;
  v_postal text;
  v_website text;
  v_instagram text;
  v_tiktok text;
  v_facebook text;
  v_tags text[];
begin
  if auth.uid() is null or not public.owns_market(p_id) then
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

  v_address := btrim(coalesce(p_address, ''));
  if char_length(v_address) < 1 then
    raise exception 'Add an address' using errcode = 'P0001';
  end if;
  if char_length(v_address) > 200 then
    raise exception 'Keep the address shorter' using errcode = 'P0001';
  end if;

  v_city := btrim(coalesce(p_city, ''));
  if char_length(v_city) < 1 then
    raise exception 'Add a city' using errcode = 'P0001';
  end if;
  if char_length(v_city) > 80 then
    raise exception 'Keep the city shorter' using errcode = 'P0001';
  end if;

  v_province := upper(btrim(coalesce(p_province, '')));
  if v_province not in ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT') then
    raise exception 'That province is not allowed' using errcode = 'P0001';
  end if;

  v_postal := nullif(upper(btrim(coalesce(p_postal_code, ''))), '');
  if v_postal is not null and (
    char_length(v_postal) > 10
    or v_postal !~ '^[A-Z0-9][A-Z0-9 -]{0,9}$'
  ) then
    raise exception 'That postal code is not allowed' using errcode = 'P0001';
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

  v_tags := public.portal_tags(p_tags, 24);

  update public.markets
  set
    name = v_name,
    about = v_about,
    address = v_address,
    city = v_city,
    province = v_province,
    postal_code = v_postal,
    website = v_website,
    instagram = v_instagram,
    tiktok = v_tiktok,
    facebook = v_facebook,
    phone = public.portal_phone(p_phone),
    email = public.portal_email(p_email),
    tags = v_tags
  where id = p_id
    and claimed_by = auth.uid();

  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$fn$;

create or replace function public.save_owned_schedule(
  p_market_id uuid,
  p_schedule_id uuid,
  p_weekday smallint,
  p_opens text,
  p_closes text,
  p_season_start text,
  p_season_end text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_opens time;
  v_closes time;
  v_start text;
  v_end text;
  v_notes text;
  v_open smallint[];
  v_season text := '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$';
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
    raise exception 'Those hours are not allowed' using errcode = 'P0001';
  end if;
  if coalesce(p_opens, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or coalesce(p_closes, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  then
    raise exception 'Those hours are not allowed' using errcode = 'P0001';
  end if;
  v_opens := p_opens::time;
  v_closes := p_closes::time;
  if v_opens >= v_closes then
    raise exception 'Open has to be before close' using errcode = 'P0001';
  end if;

  v_start := nullif(btrim(coalesce(p_season_start, '')), '');
  v_end := nullif(btrim(coalesce(p_season_end, '')), '');
  if (v_start is null) is distinct from (v_end is null)
    or (v_start is not null and v_start !~ v_season)
    or (v_end is not null and v_end !~ v_season)
  then
    raise exception 'That season is not allowed' using errcode = 'P0001';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Keep the notes shorter' using errcode = 'P0001';
  end if;

  if p_schedule_id is null and (
    select count(*) from public.market_schedules where market_id = p_market_id
  ) >= 24 then
    raise exception 'Hours list is full' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct weekday order by weekday), '{}'::smallint[])
  into v_open
  from (
    select ms.weekday
    from public.market_schedules ms
    where ms.market_id = p_market_id
      and (p_schedule_id is null or ms.id is distinct from p_schedule_id)
    union all
    select p_weekday
  ) next_hours;

  if exists (
    select 1
    from public.market_vendors mv
    cross join lateral unnest(coalesce(mv.days, '{}'::smallint[])) as d(day)
    where mv.market_id = p_market_id
      and not (d.day = any (v_open))
  ) then
    raise exception 'A stall is still set for that day' using errcode = 'P0001';
  end if;

  if p_schedule_id is null then
    insert into public.market_schedules (
      market_id, weekday, opens_at, closes_at, season_start, season_end, notes
    ) values (
      p_market_id, p_weekday, v_opens, v_closes, v_start, v_end, v_notes
    );
    return;
  end if;

  update public.market_schedules
  set
    weekday = p_weekday,
    opens_at = v_opens,
    closes_at = v_closes,
    season_start = v_start,
    season_end = v_end,
    notes = v_notes
  where id = p_schedule_id
    and market_id = p_market_id;

  if not found then
    raise exception 'Those hours are missing' using errcode = 'P0001';
  end if;
end;
$fn$;

create or replace function public.delete_owned_schedule(p_market_id uuid, p_schedule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_open smallint[];
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  select coalesce(array_agg(distinct weekday order by weekday), '{}'::smallint[])
  into v_open
  from public.market_schedules
  where market_id = p_market_id
    and id is distinct from p_schedule_id;

  if exists (
    select 1
    from public.market_vendors mv
    cross join lateral unnest(coalesce(mv.days, '{}'::smallint[])) as d(day)
    where mv.market_id = p_market_id
      and not (d.day = any (v_open))
  ) then
    raise exception 'A stall is still set for that day' using errcode = 'P0001';
  end if;

  delete from public.market_schedules
  where id = p_schedule_id
    and market_id = p_market_id;

  if not found then
    raise exception 'Those hours are missing' using errcode = 'P0001';
  end if;
end;
$fn$;

create or replace function public.save_market_roster(
  p_market_id uuid,
  p_vendor_id uuid,
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
  v_linked boolean;
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  v_stall := nullif(btrim(coalesce(p_stall, '')), '');
  if v_stall is not null and char_length(v_stall) > 80 then
    raise exception 'Keep the stall label shorter' using errcode = 'P0001';
  end if;

  v_days := public.portal_open_days(p_market_id, p_days);
  v_linked := exists (
    select 1
    from public.market_vendors
    where market_id = p_market_id
      and vendor_id = p_vendor_id
  );

  if not v_linked then
    if not exists (
      select 1
      from public.vendors
      where id = p_vendor_id
        and status = 'published'
    ) then
      raise exception 'That stall is missing' using errcode = 'P0001';
    end if;
    if (select count(*) from public.market_vendors where market_id = p_market_id) >= 200 then
      raise exception 'Stall list is full' using errcode = 'P0001';
    end if;
  elsif not exists (select 1 from public.vendors where id = p_vendor_id) then
    raise exception 'That stall is missing' using errcode = 'P0001';
  end if;

  insert into public.market_vendors (market_id, vendor_id, stall, days)
  values (p_market_id, p_vendor_id, v_stall, v_days)
  on conflict (market_id, vendor_id) do update
  set stall = excluded.stall,
      days = excluded.days;
end;
$fn$;

create or replace function public.delete_market_roster(p_market_id uuid, p_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_drop boolean;
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  delete from public.market_vendors
  where market_id = p_market_id
    and vendor_id = p_vendor_id;

  if not found then
    raise exception 'That stall is missing' using errcode = 'P0001';
  end if;

  select
    created_by_market_id = p_market_id
    and claimed_by is null
    and not exists (
      select 1 from public.market_vendors other where other.vendor_id = p_vendor_id
    )
    and not exists (
      select 1 from public.orders where vendor_id = p_vendor_id
    )
  into v_drop
  from public.vendors
  where id = p_vendor_id;

  if coalesce(v_drop, false) then
    begin
      delete from public.vendors
      where id = p_vendor_id
        and created_by_market_id = p_market_id
        and claimed_by is null;
    exception
      when foreign_key_violation then
        null;
    end;
  end if;
end;
$fn$;

create or replace function public.create_market_vendor(
  p_market_id uuid,
  p_name text,
  p_about text,
  p_website text,
  p_instagram text,
  p_tiktok text,
  p_facebook text,
  p_phone text,
  p_email text,
  p_tags text[],
  p_stall text,
  p_days smallint[]
)
returns uuid
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
  v_stall text;
  v_days smallint[];
  v_tags text[];
  v_slug text;
  v_id uuid;
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Add a name' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('market-vendor-name'), hashtext(lower(v_name)));
  if exists (
    select 1
    from public.vendors
    where status = 'published'
      and lower(btrim(name)) = lower(v_name)
  ) then
    raise exception 'That stall is already listed. Add it from search' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.vendors where created_by_market_id = p_market_id
  ) >= 80 then
    raise exception 'This market cannot add more stalls' using errcode = 'P0001';
  end if;
  if (select count(*) from public.market_vendors where market_id = p_market_id) >= 200 then
    raise exception 'Stall list is full' using errcode = 'P0001';
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

  v_stall := nullif(btrim(coalesce(p_stall, '')), '');
  if v_stall is not null and char_length(v_stall) > 80 then
    raise exception 'Keep the stall label shorter' using errcode = 'P0001';
  end if;
  v_days := public.portal_open_days(p_market_id, p_days);
  v_tags := public.portal_tags(p_tags, 24);
  v_slug := public.portal_vendor_slug(v_name);
  v_id := gen_random_uuid();

  insert into public.vendors (
    id,
    slug,
    name,
    about,
    website,
    instagram,
    tiktok,
    facebook,
    phone,
    email,
    tags,
    status,
    claimed_by,
    selling_approved,
    created_by_market_id
  ) values (
    v_id,
    v_slug,
    v_name,
    v_about,
    v_website,
    v_instagram,
    v_tiktok,
    v_facebook,
    public.portal_phone(p_phone),
    public.portal_email(p_email),
    v_tags,
    'published',
    null,
    false,
    p_market_id
  );

  insert into public.market_vendors (market_id, vendor_id, stall, days)
  values (p_market_id, v_id, v_stall, v_days);

  return v_id;
end;
$fn$;

create or replace function public.save_market_vendor_profile(
  p_market_id uuid,
  p_vendor_id uuid,
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
  v_tags text[];
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Add a name' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.vendors
    where status = 'published'
      and id <> p_vendor_id
      and lower(btrim(name)) = lower(v_name)
  ) then
    raise exception 'That stall is already listed. Add it from search' using errcode = 'P0001';
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

  v_tags := public.portal_tags(p_tags, 24);

  update public.vendors
  set
    name = v_name,
    about = v_about,
    website = v_website,
    instagram = v_instagram,
    tiktok = v_tiktok,
    facebook = v_facebook,
    phone = public.portal_phone(p_phone),
    email = public.portal_email(p_email),
    tags = v_tags
  where id = p_vendor_id
    and created_by_market_id = p_market_id
    and claimed_by is null;

  if not found then
    raise exception 'That stall is not yours to edit' using errcode = 'P0001';
  end if;
end;
$fn$;

revoke all on function public.has_owned_market() from public, anon;
grant execute on function public.has_owned_market() to authenticated;

revoke all on function public.awaiting_market_portal() from public, anon;
grant execute on function public.awaiting_market_portal() to authenticated;

revoke all on function public.my_market_portal() from public, anon;
grant execute on function public.my_market_portal() to authenticated;

revoke all on function public.save_owned_market(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.save_owned_market(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text[]) to authenticated;

revoke all on function public.save_owned_schedule(uuid, uuid, smallint, text, text, text, text, text) from public, anon;
grant execute on function public.save_owned_schedule(uuid, uuid, smallint, text, text, text, text, text) to authenticated;

revoke all on function public.delete_owned_schedule(uuid, uuid) from public, anon;
grant execute on function public.delete_owned_schedule(uuid, uuid) to authenticated;

revoke all on function public.save_market_roster(uuid, uuid, text, smallint[]) from public, anon;
grant execute on function public.save_market_roster(uuid, uuid, text, smallint[]) to authenticated;

revoke all on function public.delete_market_roster(uuid, uuid) from public, anon;
grant execute on function public.delete_market_roster(uuid, uuid) to authenticated;

revoke all on function public.create_market_vendor(uuid, text, text, text, text, text, text, text, text, text[], text, smallint[]) from public, anon;
grant execute on function public.create_market_vendor(uuid, text, text, text, text, text, text, text, text, text[], text, smallint[]) to authenticated;

revoke all on function public.save_market_vendor_profile(uuid, uuid, text, text, text, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.save_market_vendor_profile(uuid, uuid, text, text, text, text, text, text, text, text, text[]) to authenticated;

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
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|directory_census|markets|vendors|vendor_stripe_accounts|vendor_sign_in_secrets|orders|platform_fees|platform_fee_payments|platform_fee_sessions)(/|$)'
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
      'delete_owned_stall',
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
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;
