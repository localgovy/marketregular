-- "Selling today" means the hall has not closed yet, not merely that the weekday is in season.
-- Menu search uses a stored document instead of building to_tsvector on every row.
-- The public market count skips a seasonal alias that the site folds into its host.
-- Keep this slug in step with SEASON_ALIASES in src/lib/listing-siblings.ts.

create extension if not exists pg_trgm;

alter table public.vendor_menus
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  ) stored;

create index if not exists vendor_menus_search_document_idx
  on public.vendor_menus using gin (search_document);

create index if not exists vendor_menus_name_trgm_idx
  on public.vendor_menus using gin (name gin_trgm_ops);

create index if not exists vendor_menus_product_slug_idx
  on public.vendor_menus (product_slug);

grant select (search_document) on public.vendor_menus to anon, authenticated;

drop function if exists public.search_products(text, boolean, text, integer, integer);

create function public.search_products(
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
      greatest(coalesce(off, 0), 0) as off_n,
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
grant execute on function public.search_products(text, boolean, text, integer, integer, integer) to anon, authenticated;

create or replace function private.refresh_directory_census()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.directory_census (id, markets, vendors, menus, tallied_at)
  values (
    'toronto',
    (
      select count(*)::integer
      from public.markets
      where status = 'published'
        and slug <> 'leslieville-farmers-market-east-end-food-hub'
    ),
    (
      select count(distinct v.id)::integer
      from public.vendors v
      join public.market_vendors mv on mv.vendor_id = v.id
      join public.markets m on m.id = mv.market_id
      where v.status = 'published'
        and m.status = 'published'
    ),
    (
      select count(*)::integer
      from public.vendor_menus vm
      where vm.vendor_id in (
        select distinct v.id
        from public.vendors v
        join public.market_vendors mv on mv.vendor_id = v.id
        join public.markets m on m.id = mv.market_id
        where v.status = 'published'
          and m.status = 'published'
      )
    ),
    now()
  )
  on conflict (id) do update
    set markets = excluded.markets,
        vendors = excluded.vendors,
        menus = excluded.menus,
        tallied_at = excluded.tallied_at;
end;
$$;

select private.refresh_directory_census();
