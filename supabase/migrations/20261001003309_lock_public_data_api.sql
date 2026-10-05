-- The anon key ships in the browser. Directory tables, contact lookup, and
-- product search are no longer executable or selectable by anon or authenticated.
-- The site reads published views with the service role. PostGIS stays in public
-- so schedule SQL can call st_*; postgres cannot revoke supabase_admin grants,
-- and spatial_ref_sys stays without RLS. The pre-request hook is still the
-- control for that catalog.

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon, authenticated';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on functions from anon, authenticated';
exception
  when insufficient_privilege then
    raise notice 'supabase_admin default privileges unchanged: %', sqlerrm;
end $$;

revoke all on table public.markets from public, anon, authenticated;
revoke all on table public.vendors from public, anon, authenticated;
revoke all on table public.vendor_menus from public, anon, authenticated;
revoke all on table public.market_vendors from public, anon, authenticated;
revoke all on table public.market_schedules from public, anon, authenticated;
revoke all on table public.product_synonyms from public, anon, authenticated;
revoke all on table public.directory_census from public, anon, authenticated;

-- Claimants had DELETE without INSERT or UPDATE. Admin writes these with the service role.
revoke delete on table public.vendor_menus from authenticated;
revoke delete on table public.market_schedules from authenticated;

create or replace view public.published_markets
with (security_invoker = true) as
select
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
  tags,
  status,
  featured,
  created_at,
  updated_at,
  logo_url,
  review_count,
  rating_avg,
  instagram,
  tiktok,
  facebook
from public.markets
where status = 'published';

create or replace view public.published_vendors
with (security_invoker = true) as
select
  id,
  slug,
  name,
  about,
  website,
  tags,
  status,
  created_at,
  updated_at,
  logo_url,
  review_count,
  rating_avg,
  instagram,
  tiktok,
  facebook
from public.vendors
where status = 'published';

create or replace view public.published_schedules
with (security_invoker = true) as
select
  ms.id,
  ms.market_id,
  ms.weekday,
  ms.opens_at,
  ms.closes_at,
  ms.season_start,
  ms.season_end,
  ms.notes
from public.market_schedules ms
join public.markets m
  on m.id = ms.market_id
 and m.status = 'published';

create or replace view public.published_stalls
with (security_invoker = true) as
select
  mv.market_id,
  mv.vendor_id,
  mv.stall,
  mv.days,
  v.name as vendor_name,
  v.slug as vendor_slug,
  v.status as vendor_status,
  m.slug as market_slug,
  m.name as market_name,
  m.city as market_city,
  m.status as market_status
from public.market_vendors mv
join public.vendors v
  on v.id = mv.vendor_id
 and v.status = 'published'
join public.markets m
  on m.id = mv.market_id
 and m.status = 'published';

create or replace view public.published_menus
with (security_invoker = true) as
select
  vm.id,
  vm.vendor_id,
  vm.name,
  vm.description,
  vm.price_cents,
  vm.season,
  vm.dietary,
  vm.product_category,
  vm.product_slug
from public.vendor_menus vm
join public.vendors v
  on v.id = vm.vendor_id
 and v.status = 'published';

revoke all on table public.published_markets from public, anon, authenticated;
revoke all on table public.published_vendors from public, anon, authenticated;
revoke all on table public.published_schedules from public, anon, authenticated;
revoke all on table public.published_stalls from public, anon, authenticated;
revoke all on table public.published_menus from public, anon, authenticated;

grant select on table public.published_markets to service_role;
grant select on table public.published_vendors to service_role;
grant select on table public.published_schedules to service_role;
grant select on table public.published_stalls to service_role;
grant select on table public.published_menus to service_role;

create or replace function public.menu_vendor_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(array_agg(distinct vm.vendor_id), '{}'::uuid[])
  from public.vendor_menus vm
  join public.vendors v
    on v.id = vm.vendor_id
   and v.status = 'published';
$$;

create or replace function public.search_products(
  q text,
  open_today boolean default false,
  market_slug text default null,
  day integer default null,
  lim integer default 40,
  off integer default 0
)
returns table (
  item_name text,
  product_category text,
  product_slug text,
  price_cents integer,
  vendor_name text,
  vendor_slug text,
  markets jsonb,
  open_today boolean
)
language sql
stable
security invoker
set search_path = public
as $fn$
  with input as (
    select
      btrim(coalesce(q, '')) as query,
      coalesce(open_today, false) as want_open,
      nullif(btrim(coalesce(market_slug, '')), '') as market_slug,
      case when day between 0 and 6 then day else null end as day_n,
      (day is null or day between 0 and 6) as day_ok,
      least(greatest(coalesce(lim, 40), 1), 40) as lim_n,
      least(greatest(coalesce(off, 0), 0), 4000) as off_n,
      (timezone('America/Toronto', now()))::date as today,
      (
        extract(hour from timezone('America/Toronto', now()))::integer * 60
        + extract(minute from timezone('America/Toronto', now()))::integer
      ) as now_min
  ),
  timed as (
    select
      input.query,
      input.want_open,
      input.market_slug,
      input.day_n,
      input.lim_n,
      input.off_n,
      input.now_min,
      input.today,
      extract(dow from input.today)::integer as today_wd,
      to_char(input.today, 'MM-DD') as today_md,
      case
        when input.day_n is null then null
        else input.today + ((input.day_n - extract(dow from input.today)::integer + 7) % 7)
      end as day_date
    from input
    where input.query <> ''
      and input.day_ok
  ),
  clock as (
    select
      timed.*,
      to_char(timed.day_date, 'MM-DD') as day_md
    from timed
  ),
  phrases as (
    select clock.query as phrase
    from clock
    union
    select lower(s.canonical) as phrase
    from public.product_synonyms s
    cross join clock
    where lower(s.term) = lower(clock.query)
  ),
  slugs as (
    select distinct trim(both '-' from regexp_replace(lower(phrases.phrase), '[^a-z0-9]+', '-', 'g')) as slug
    from phrases
    where btrim(phrases.phrase) <> ''
  ),
  cats as (
    select distinct s.category
    from public.product_synonyms s
    cross join clock
    where lower(s.term) = lower(clock.query)
      and s.category is not null
      and (
        lower(s.canonical) = lower(s.category)
        or lower(replace(s.category, '-', ' ')) = lower(s.canonical)
        or lower(s.category) = lower(clock.query)
        or lower(replace(s.category, '-', ' ')) = lower(clock.query)
      )
  ),
  seasons as (
    select
      ms.market_id,
      ms.weekday,
      ms.closes_at,
      (
        ms.season_start is null
        or ms.season_end is null
        or ms.season_start !~ '^[0-9]{2}-[0-9]{2}$'
        or ms.season_end !~ '^[0-9]{2}-[0-9]{2}$'
        or (
          ms.season_start <= ms.season_end
          and clock.today_md between ms.season_start and ms.season_end
        )
        or (
          ms.season_start > ms.season_end
          and (clock.today_md >= ms.season_start or clock.today_md <= ms.season_end)
        )
      ) as in_season_today,
      (
        clock.day_n is not null
        and (
          ms.season_start is null
          or ms.season_end is null
          or ms.season_start !~ '^[0-9]{2}-[0-9]{2}$'
          or ms.season_end !~ '^[0-9]{2}-[0-9]{2}$'
          or (
            ms.season_start <= ms.season_end
            and clock.day_md between ms.season_start and ms.season_end
          )
          or (
            ms.season_start > ms.season_end
            and (clock.day_md >= ms.season_start or clock.day_md <= ms.season_end)
          )
        )
      ) as in_season_day
    from public.market_schedules ms
    cross join clock
  ),
  ranked as (
    select
      vm.name as item_name,
      vm.product_category,
      vm.product_slug,
      case
        when vm.product_category = 'alcohol' then null
        else vm.price_cents
      end as price_cents,
      v.name as vendor_name,
      v.slug as vendor_slug,
      v.id as vendor_id,
      (
        case
          when vm.product_slug in (select slugs.slug from slugs) then 3
          else 0
        end
        + ts_rank(vm.search_document, plainto_tsquery('english', clock.query))
        + coalesce((
          select max(ts_rank(vm.search_document, plainto_tsquery('english', phrases.phrase)))
          from phrases
          where lower(phrases.phrase) <> lower(clock.query)
        ), 0)
        + case
          when char_length(clock.query) >= 3 then similarity(lower(vm.name), lower(clock.query))
          else 0
        end
        + case
          when vm.product_category in (select cats.category from cats)
            and vm.product_slug not in (select slugs.slug from slugs)
          then 0.05
          else 0
        end
      ) as score
    from public.vendor_menus vm
    join public.vendors v
      on v.id = vm.vendor_id
      and v.status = 'published'
    cross join clock
    where (
      vm.product_slug in (select slugs.slug from slugs)
      or vm.product_category in (select cats.category from cats)
      or vm.search_document @@ plainto_tsquery('english', clock.query)
      or exists (
        select 1
        from phrases
        where lower(phrases.phrase) <> lower(clock.query)
          and vm.search_document @@ plainto_tsquery('english', phrases.phrase)
      )
      or (
        char_length(clock.query) >= 3
        and lower(vm.name) % lower(clock.query)
      )
    )
      and exists (
        select 1
        from public.market_vendors mv
        join public.markets m
          on m.id = mv.market_id
          and m.status = 'published'
        where mv.vendor_id = v.id
          and (clock.market_slug is null or m.slug = clock.market_slug)
      )
      and (
        not clock.want_open
        or exists (
          select 1
          from public.market_vendors mv
          join public.markets m
            on m.id = mv.market_id
            and m.status = 'published'
          join seasons
            on seasons.market_id = m.id
            and seasons.weekday = clock.today_wd
            and seasons.in_season_today
            and (
              extract(hour from seasons.closes_at)::integer * 60
              + extract(minute from seasons.closes_at)::integer
            ) >= clock.now_min
          where mv.vendor_id = v.id
            and clock.today_wd = any (mv.days)
            and (clock.market_slug is null or m.slug = clock.market_slug)
        )
      )
      and (
        clock.day_n is null
        or exists (
          select 1
          from public.market_vendors mv
          join public.markets m
            on m.id = mv.market_id
            and m.status = 'published'
          join seasons
            on seasons.market_id = m.id
            and seasons.weekday = clock.day_n
            and seasons.in_season_day
          where mv.vendor_id = v.id
            and clock.day_n = any (mv.days)
            and (clock.market_slug is null or m.slug = clock.market_slug)
        )
      )
  )
  select
    ranked.item_name,
    ranked.product_category,
    ranked.product_slug,
    ranked.price_cents,
    ranked.vendor_name,
    ranked.vendor_slug,
    (
      select coalesce(jsonb_agg(hall.obj order by hall.obj->>'name'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'name', m.name,
          'slug', m.slug,
          'days', to_jsonb(mv.days)
        ) as obj
        from public.market_vendors mv
        join public.markets m
          on m.id = mv.market_id
          and m.status = 'published'
        where mv.vendor_id = ranked.vendor_id
      ) as hall
    ) as markets,
    exists (
      select 1
      from public.market_vendors mv
      join public.markets m
        on m.id = mv.market_id
        and m.status = 'published'
      join seasons
        on seasons.market_id = m.id
        and seasons.weekday = clock.today_wd
        and seasons.in_season_today
        and (
          extract(hour from seasons.closes_at)::integer * 60
          + extract(minute from seasons.closes_at)::integer
        ) >= clock.now_min
      where mv.vendor_id = ranked.vendor_id
        and clock.today_wd = any (mv.days)
        and (clock.market_slug is null or m.slug = clock.market_slug)
    ) as open_today
  from ranked
  cross join clock
  order by ranked.score desc, ranked.vendor_name, ranked.item_name
  offset (select clock.off_n from clock)
  limit (select clock.lim_n from clock);
$fn$;


revoke all on function public.search_products(text, boolean, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.search_products(text, boolean, text, integer, integer, integer) to service_role;

revoke all on function public.get_listing_contact(text, text) from public, anon, authenticated;
grant execute on function public.get_listing_contact(text, text) to service_role;

revoke all on function public.menu_vendor_ids() from public, anon, authenticated;
grant execute on function public.menu_vendor_ids() to service_role;

alter table public.mail_sends drop constraint if exists mail_sends_kind_check;
alter table public.mail_sends
  add constraint mail_sends_kind_check
  check (kind in ('claim', 'claim_ip', 'visit', 'catalog'));

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
  if p_kind not in ('claim', 'claim_ip', 'visit', 'catalog') then
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
  if p_kind not in ('claim', 'claim_ip', 'visit', 'catalog') then
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
  -- Direct SQL (migrations, geofence checks) does not set request.path.
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
    and rpc in ('is_admin', 'my_profile', 'stamp_onboarded_at')
  then
    return;
  end if;
  raise exception 'not allowed' using errcode = '42501';
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;

alter function private.classify_product_v1_3(text) set search_path = private, public;
alter function private.nonfood_guard_v1_3(text, text) set search_path = private, public;

-- Posts, reviews, and profiles still have public read policies. Those policies
-- used to subquery markets and vendors, which now fails closed because those
-- tables are not granted. The helpers run as the owner, and they are not in
-- the exposed API schema, so the anon key cannot call them over PostgREST.
create or replace function private.market_is_published(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.markets
    where id = p_id
      and status = 'published'
  );
$$;

create or replace function private.vendor_is_published(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendors
    where id = p_id
      and status = 'published'
  );
$$;

create or replace function private.profile_is_readable(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_id = auth.uid()
    or exists (
      select 1
      from public.posts p
      where p.user_id = p_id
        and p.flagged = false
        and private.market_is_published(p.market_id)
    )
    or exists (
      select 1
      from public.reviews r
      where r.user_id = p_id
        and r.flagged = false
        and (
          (r.market_id is not null and private.market_is_published(r.market_id))
          or (r.vendor_id is not null and private.vendor_is_published(r.vendor_id))
        )
    );
$$;

revoke all on function private.market_is_published(uuid) from public, anon, authenticated;
revoke all on function private.vendor_is_published(uuid) from public, anon, authenticated;
revoke all on function private.profile_is_readable(uuid) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.market_is_published(uuid) to anon, authenticated;
grant execute on function private.vendor_is_published(uuid) to anon, authenticated;
grant execute on function private.profile_is_readable(uuid) to anon, authenticated;

drop policy if exists "posts readable" on public.posts;
create policy "posts readable"
  on public.posts
  for select
  to public
  using (flagged = false and private.market_is_published(market_id));

drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable"
  on public.reviews
  for select
  to public
  using (
    flagged = false
    and (
      (market_id is not null and private.market_is_published(market_id))
      or (vendor_id is not null and private.vendor_is_published(vendor_id))
    )
  );

drop policy if exists "authors and self readable" on public.profiles;
create policy "authors and self readable"
  on public.profiles
  for select
  to public
  using (private.profile_is_readable(id));

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
