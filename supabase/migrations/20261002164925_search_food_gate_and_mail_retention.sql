-- Food search matches the find-page categories. Name-only full text, and trigram only
-- for a single word at similarity 0.45. Non-food queries stay allowed.
-- Claim mail rows expire, and every claim IP shares one site-wide bucket.

create index if not exists vendor_menus_name_search_idx
  on public.vendor_menus
  using gin (to_tsvector('english', coalesce(name, '')));

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
      left(btrim(coalesce(q, '')), 80) as query,
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
  nonfood as (
    select exists (
      select 1
      from regexp_split_to_table(lower(clock.query), '[^a-z0-9]+') as word
      where word in (
        'candle', 'candles',
        'soap', 'soaps',
        'lotion', 'lotions',
        'balm', 'balms',
        'flower', 'flowers',
        'plant', 'plants',
        'craft', 'crafts',
        'art', 'arts',
        'clothing',
        'toy', 'toys',
        'pottery',
        'skincare'
      )
      or word like 'jewel%'
    ) as allow
    from clock
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
        + ts_rank(to_tsvector('english', coalesce(vm.name, '')), plainto_tsquery('english', clock.query))
        + coalesce((
          select max(ts_rank(to_tsvector('english', coalesce(vm.name, '')), plainto_tsquery('english', phrases.phrase)))
          from phrases
          where lower(phrases.phrase) <> lower(clock.query)
        ), 0)
        + case
          when strpos(clock.query, ' ') = 0 and char_length(clock.query) >= 3
            then similarity(lower(vm.name), lower(clock.query))
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
      or to_tsvector('english', coalesce(vm.name, '')) @@ plainto_tsquery('english', clock.query)
      or exists (
        select 1
        from phrases
        where lower(phrases.phrase) <> lower(clock.query)
          and to_tsvector('english', coalesce(vm.name, '')) @@ plainto_tsquery('english', phrases.phrase)
      )
      or (
        strpos(clock.query, ' ') = 0
        and char_length(clock.query) >= 3
        and lower(vm.name) % lower(clock.query)
        and similarity(lower(vm.name), lower(clock.query)) >= 0.45
      )
    )
      and (
        (select nonfood.allow from nonfood)
        or vm.product_category in (
          'bread-and-bakery',
          'eggs',
          'honey',
          'cheese-and-dairy',
          'maple',
          'apples-and-fruit',
          'vegetables',
          'meat-and-turkey',
          'pies-and-sweets',
          'prepared-foods',
          'preserves-and-sauces',
          'coffee-and-tea',
          'alcohol',
          'seafood',
          'flour-and-grains',
          'nuts-and-snacks',
          'beverages'
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
  keys text[];
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

  delete from public.mail_sends
  where created_at < now() - interval '48 hours';

  keys := p_keys;
  -- One site-wide bucket so rotating IPs share the claim_ip quota.
  if p_kind = 'claim_ip' and not ('claim-site' = any (keys)) then
    keys := keys || array['claim-site'];
  end if;

  for k in
    select x from unnest(keys) as x order by 1
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
  select p_kind, unnest(keys);
  return true;
end;
$$;

revoke all on function public.take_mail_slot(text, text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.take_mail_slot(text, text[], integer, integer)
  to service_role;
