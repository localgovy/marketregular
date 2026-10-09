-- General-term search. Terms point at classifiers. Menu items carry classifiers.
-- Search code does not name a food. Bots extend the rows; they do not edit this function
-- to add a word.
--
-- A query that is a whole search term uses that term only.
-- Otherwise the query is split left to right into the longest known phrases.
-- Terms AND together. Classifiers inside one term OR together.
-- Words that are not a term must appear in the item name.
-- A query that matches no term stays on the name, synonym, category, and trigram path.

create table public.menu_classifiers (
  slug text primary key,
  facet text not null,
  value text not null,
  label text not null,
  constraint menu_classifiers_facet_check
    check (facet in ('kind', 'use', 'occasion', 'meal', 'ingredient', 'diet')),
  constraint menu_classifiers_value_check
    check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint menu_classifiers_slug_check
    check (slug = facet || '.' || value),
  constraint menu_classifiers_label_check
    check (char_length(btrim(label)) between 1 and 80)
);

create table public.vendor_menu_classifier_assignments (
  menu_id uuid not null references public.vendor_menus (id) on delete cascade,
  classifier_slug text not null references public.menu_classifiers (slug),
  source text not null,
  primary key (menu_id, classifier_slug),
  constraint vendor_menu_classifier_assignments_source_check
    check (char_length(btrim(source)) between 1 and 80)
);

create index vendor_menu_classifier_assignments_slug_idx
  on public.vendor_menu_classifier_assignments (classifier_slug);

create table public.vendor_menu_classifier_reviews (
  menu_id uuid primary key references public.vendor_menus (id) on delete cascade,
  source text not null,
  basis text not null,
  tagged_at timestamptz not null default now(),
  constraint vendor_menu_classifier_reviews_source_check
    check (char_length(btrim(source)) between 1 and 80),
  constraint vendor_menu_classifier_reviews_basis_check
    check (char_length(basis) between 1 and 400)
);

comment on table public.menu_classifiers is
  'Allowed classifier values. Facet is fixed. Bots insert values. Slug is facet.value.';
comment on table public.vendor_menu_classifier_assignments is
  'Classifiers on one menu item. Empty is allowed: a review row with no assignments means judged, nothing applies.';
comment on column public.vendor_menu_classifier_reviews.basis is
  'lower(btrim(name)) || ''|'' || left(coalesce(btrim(description), ''''), 160) at tag time. A name or description change sends the item back to the queue.';
comment on table public.vendor_menu_classifier_reviews is
  'One row once a bot has judged the item, including a judgment that no classifier applies.';

create table public.search_terms (
  term text primary key,
  label text not null,
  source text not null,
  constraint search_terms_term_check
    check (
      char_length(term) between 1 and 80
      and term = lower(btrim(term))
      and term !~ '[[:space:]]{2}'
    ),
  constraint search_terms_label_check
    check (char_length(btrim(label)) between 1 and 80),
  constraint search_terms_source_check
    check (char_length(btrim(source)) between 1 and 80)
);

create table public.search_term_classifiers (
  term text not null references public.search_terms (term) on delete cascade,
  classifier_slug text not null references public.menu_classifiers (slug),
  weight smallint not null,
  primary key (term, classifier_slug),
  constraint search_term_classifiers_weight_check
    check (weight in (1, 2, 3))
);

comment on table public.search_terms is
  'General search phrases. The full query wins over a split. There is no stemmer.';
comment on table public.search_term_classifiers is
  'Weight 3 is the thing asked for, 2 is a defining member, 1 is related.';

alter table public.menu_classifiers enable row level security;
alter table public.vendor_menu_classifier_assignments enable row level security;
alter table public.vendor_menu_classifier_reviews enable row level security;
alter table public.search_terms enable row level security;
alter table public.search_term_classifiers enable row level security;

revoke all on table public.menu_classifiers from public, anon, authenticated;
revoke all on table public.vendor_menu_classifier_assignments from public, anon, authenticated;
revoke all on table public.vendor_menu_classifier_reviews from public, anon, authenticated;
revoke all on table public.search_terms from public, anon, authenticated;
revoke all on table public.search_term_classifiers from public, anon, authenticated;

grant select, insert, update, delete on table public.menu_classifiers to service_role;
grant select, insert, update, delete on table public.vendor_menu_classifier_assignments to service_role;
grant select, insert, update, delete on table public.vendor_menu_classifier_reviews to service_role;
grant select, insert, update, delete on table public.search_terms to service_role;
grant select, insert, update, delete on table public.search_term_classifiers to service_role;

create or replace function public.search_query_parts(q text)
returns table (part_kind text, part_value text, part_ord integer)
language plpgsql
stable
set search_path = public
as $fn$
declare
  raw text := lower(left(btrim(coalesce(q, '')), 80));
  words text[];
  n integer;
  i integer;
  j integer;
  phrase text;
  found boolean;
  ord integer := 0;
begin
  if raw = '' then
    return;
  end if;

  if exists (select 1 from public.search_terms st where st.term = raw) then
    part_kind := 'term';
    part_value := raw;
    part_ord := 1;
    return next;
    return;
  end if;

  select coalesce(array_agg(piece order by piece_ord), '{}')
    into words
  from (
    select piece, piece_ord
    from regexp_split_to_table(raw, '[[:space:]]+') with ordinality as token(piece, piece_ord)
    where piece <> ''
  ) parts;

  n := coalesce(cardinality(words), 0);
  i := 1;
  while i <= n loop
    found := false;
    for j in reverse n .. i loop
      phrase := array_to_string(words[i:j], ' ');
      if phrase <> '' and exists (
        select 1 from public.search_terms st where st.term = phrase
      ) then
        ord := ord + 1;
        part_kind := 'term';
        part_value := phrase;
        part_ord := ord;
        return next;
        i := j + 1;
        found := true;
        exit;
      end if;
    end loop;
    if not found then
      ord := ord + 1;
      part_kind := 'word';
      part_value := words[i];
      part_ord := ord;
      return next;
      i := i + 1;
    end if;
  end loop;
end;
$fn$;

revoke all on function public.search_query_parts(text) from public, anon, authenticated;
grant execute on function public.search_query_parts(text) to service_role;

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
  query_parts as (
    select part_kind, part_value, part_ord
    from public.search_query_parts((select clock.query from clock))
  ),
  has_terms as (
    select exists (
      select 1 from query_parts where part_kind = 'term'
    ) as yes
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
          when position(lower(clock.query) in lower(coalesce(vm.name, ''))) > 0 then 1000
          else 0
        end
        + case
          when vm.product_slug in (select slugs.slug from slugs) then 100
          else 0
        end
        + coalesce((
          select sum(best.weight)::numeric
          from (
            select max(stc.weight) as weight
            from query_parts parts
            join public.search_term_classifiers stc
              on stc.term = parts.part_value
            join public.vendor_menu_classifier_assignments a
              on a.menu_id = vm.id
             and a.classifier_slug = stc.classifier_slug
            where parts.part_kind = 'term'
            group by parts.part_value
          ) best
        ), 0)
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
    cross join lateral (
      select
        (
          (select yes from has_terms)
          and not exists (
            select 1
            from query_parts term_part
            where term_part.part_kind = 'term'
              and not exists (
                select 1
                from public.search_term_classifiers stc
                join public.vendor_menu_classifier_assignments a
                  on a.classifier_slug = stc.classifier_slug
                 and a.menu_id = vm.id
                where stc.term = term_part.part_value
              )
          )
          and not exists (
            select 1
            from query_parts word_part
            where word_part.part_kind = 'word'
              and position(word_part.part_value in lower(coalesce(vm.name, ''))) = 0
          )
        ) as classified,
        (
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
        ) as existing
    ) match
    where (
      (not (select yes from has_terms) and match.existing)
      or ((select yes from has_terms) and (match.classified or match.existing))
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
        or (vm.product_category is null and match.classified)
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
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|menu_classifiers|vendor_menu_classifier_assignments|vendor_menu_classifier_reviews|search_terms|search_term_classifiers|directory_census|markets|vendors|vendor_stripe_accounts|vendor_sign_in_secrets|orders|platform_fees|platform_fee_payments|platform_fee_sessions)(/|$)'
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
      'save_owned_maintenance_opt_outs',
      'save_owned_menu_item',
      'delete_owned_menu_item',
      'save_owned_stall',
      'delete_owned_stall',
      'set_owned_menu_sections',
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

-- Classifier values, general terms, and the starter links between them.
insert into public.menu_classifiers (slug, facet, value, label) values
  ('diet.dairy-free', 'diet', 'dairy-free', 'Dairy-free'),
  ('diet.gluten-free', 'diet', 'gluten-free', 'Gluten-free'),
  ('diet.halal', 'diet', 'halal', 'Halal'),
  ('diet.keto', 'diet', 'keto', 'Keto'),
  ('diet.organic', 'diet', 'organic', 'Organic'),
  ('diet.vegan', 'diet', 'vegan', 'Vegan'),
  ('diet.vegetarian', 'diet', 'vegetarian', 'Vegetarian'),
  ('ingredient.apple', 'ingredient', 'apple', 'Apple'),
  ('ingredient.chocolate', 'ingredient', 'chocolate', 'Chocolate'),
  ('ingredient.cranberry', 'ingredient', 'cranberry', 'Cranberry'),
  ('ingredient.pumpkin', 'ingredient', 'pumpkin', 'Pumpkin'),
  ('kind.almond-croissant', 'kind', 'almond-croissant', 'Almond croissant'),
  ('kind.apple-butter', 'kind', 'apple-butter', 'Apple butter'),
  ('kind.apple-cider', 'kind', 'apple-cider', 'Apple cider'),
  ('kind.apple-fritter', 'kind', 'apple-fritter', 'Apple fritter'),
  ('kind.apple-pie', 'kind', 'apple-pie', 'Apple pie'),
  ('kind.apples', 'kind', 'apples', 'Apples'),
  ('kind.apricots', 'kind', 'apricots', 'Apricots'),
  ('kind.arugula', 'kind', 'arugula', 'Arugula'),
  ('kind.asparagus', 'kind', 'asparagus', 'Asparagus'),
  ('kind.bacon', 'kind', 'bacon', 'Bacon'),
  ('kind.bagels', 'kind', 'bagels', 'Bagels'),
  ('kind.basil', 'kind', 'basil', 'Basil'),
  ('kind.beans', 'kind', 'beans', 'Beans'),
  ('kind.bee-pollen', 'kind', 'bee-pollen', 'Bee pollen'),
  ('kind.beef', 'kind', 'beef', 'Beef'),
  ('kind.beets', 'kind', 'beets', 'Beets'),
  ('kind.blackberries', 'kind', 'blackberries', 'Blackberries'),
  ('kind.blueberries', 'kind', 'blueberries', 'Blueberries'),
  ('kind.bok-choy', 'kind', 'bok-choy', 'Bok choy'),
  ('kind.bread', 'kind', 'bread', 'Bread'),
  ('kind.breakfast-sausage', 'kind', 'breakfast-sausage', 'Breakfast sausage'),
  ('kind.broccoli', 'kind', 'broccoli', 'Broccoli'),
  ('kind.broccoli-microgreens', 'kind', 'broccoli-microgreens', 'Broccoli microgreens'),
  ('kind.brownies', 'kind', 'brownies', 'Brownies'),
  ('kind.burgers', 'kind', 'burgers', 'Burgers'),
  ('kind.butter-chicken', 'kind', 'butter-chicken', 'Butter chicken'),
  ('kind.butter-tarts', 'kind', 'butter-tarts', 'Butter tarts'),
  ('kind.cabbage', 'kind', 'cabbage', 'Cabbage'),
  ('kind.cakes', 'kind', 'cakes', 'Cakes'),
  ('kind.carrots', 'kind', 'carrots', 'Carrots'),
  ('kind.cauliflower', 'kind', 'cauliflower', 'Cauliflower'),
  ('kind.cheese', 'kind', 'cheese', 'Cheese'),
  ('kind.cheesecake', 'kind', 'cheesecake', 'Cheesecake'),
  ('kind.cherries', 'kind', 'cherries', 'Cherries'),
  ('kind.cherry-tomatoes', 'kind', 'cherry-tomatoes', 'Cherry tomatoes'),
  ('kind.chicken', 'kind', 'chicken', 'Chicken'),
  ('kind.chocolate-chip-cookies', 'kind', 'chocolate-chip-cookies', 'Chocolate chip cookies'),
  ('kind.chutneys', 'kind', 'chutneys', 'Chutneys'),
  ('kind.cinnamon-buns', 'kind', 'cinnamon-buns', 'Cinnamon buns'),
  ('kind.coffee', 'kind', 'coffee', 'Coffee'),
  ('kind.comb-honey', 'kind', 'comb-honey', 'Comb honey'),
  ('kind.cookies', 'kind', 'cookies', 'Cookies'),
  ('kind.corn', 'kind', 'corn', 'Corn'),
  ('kind.creamed-honey', 'kind', 'creamed-honey', 'Creamed honey'),
  ('kind.croissants', 'kind', 'croissants', 'Croissants'),
  ('kind.cucumbers', 'kind', 'cucumbers', 'Cucumbers'),
  ('kind.cupcakes', 'kind', 'cupcakes', 'Cupcakes'),
  ('kind.dill', 'kind', 'dill', 'Dill'),
  ('kind.donuts', 'kind', 'donuts', 'Donuts'),
  ('kind.dried-fruits', 'kind', 'dried-fruits', 'Dried fruits'),
  ('kind.eggplant', 'kind', 'eggplant', 'Eggplant'),
  ('kind.eggs', 'kind', 'eggs', 'Eggs'),
  ('kind.focaccia', 'kind', 'focaccia', 'Focaccia'),
  ('kind.free-range-chicken', 'kind', 'free-range-chicken', 'Free range chicken'),
  ('kind.garlic', 'kind', 'garlic', 'Garlic'),
  ('kind.grapes', 'kind', 'grapes', 'Grapes'),
  ('kind.grass-fed-beef', 'kind', 'grass-fed-beef', 'Grass fed beef'),
  ('kind.green-beans', 'kind', 'green-beans', 'Green beans'),
  ('kind.green-onions', 'kind', 'green-onions', 'Green onions'),
  ('kind.heirloom-tomatoes', 'kind', 'heirloom-tomatoes', 'Heirloom tomatoes'),
  ('kind.herbs', 'kind', 'herbs', 'Herbs'),
  ('kind.honey', 'kind', 'honey', 'Honey'),
  ('kind.honeycomb', 'kind', 'honeycomb', 'Honeycomb'),
  ('kind.hot-sauce', 'kind', 'hot-sauce', 'Hot sauce'),
  ('kind.ice-cream', 'kind', 'ice-cream', 'Ice cream'),
  ('kind.jams', 'kind', 'jams', 'Jams'),
  ('kind.jellies', 'kind', 'jellies', 'Jellies'),
  ('kind.jerk-chicken', 'kind', 'jerk-chicken', 'Jerk chicken'),
  ('kind.kale', 'kind', 'kale', 'Kale'),
  ('kind.lamb', 'kind', 'lamb', 'Lamb'),
  ('kind.leeks', 'kind', 'leeks', 'Leeks'),
  ('kind.lemonade', 'kind', 'lemonade', 'Lemonade'),
  ('kind.lettuce', 'kind', 'lettuce', 'Lettuce'),
  ('kind.maple-butter', 'kind', 'maple-butter', 'Maple butter'),
  ('kind.maple-syrup', 'kind', 'maple-syrup', 'Maple syrup'),
  ('kind.matcha', 'kind', 'matcha', 'Matcha'),
  ('kind.meat-pies', 'kind', 'meat-pies', 'Meat pies'),
  ('kind.melons', 'kind', 'melons', 'Melons'),
  ('kind.microgreens', 'kind', 'microgreens', 'Microgreens'),
  ('kind.milk', 'kind', 'milk', 'Milk'),
  ('kind.muffins', 'kind', 'muffins', 'Muffins'),
  ('kind.mushrooms', 'kind', 'mushrooms', 'Mushrooms'),
  ('kind.nectarines', 'kind', 'nectarines', 'Nectarines'),
  ('kind.okra', 'kind', 'okra', 'Okra'),
  ('kind.olive-oil', 'kind', 'olive-oil', 'Olive oil'),
  ('kind.onions', 'kind', 'onions', 'Onions'),
  ('kind.oranges', 'kind', 'oranges', 'Oranges'),
  ('kind.parsley', 'kind', 'parsley', 'Parsley'),
  ('kind.parsnips', 'kind', 'parsnips', 'Parsnips'),
  ('kind.pastries', 'kind', 'pastries', 'Pastries'),
  ('kind.peaches', 'kind', 'peaches', 'Peaches'),
  ('kind.peameal-bacon', 'kind', 'peameal-bacon', 'Peameal bacon'),
  ('kind.pears', 'kind', 'pears', 'Pears'),
  ('kind.peas', 'kind', 'peas', 'Peas'),
  ('kind.pepperettes', 'kind', 'pepperettes', 'Pepperettes'),
  ('kind.peppers', 'kind', 'peppers', 'Peppers'),
  ('kind.perogies', 'kind', 'perogies', 'Perogies'),
  ('kind.pickles', 'kind', 'pickles', 'Pickles'),
  ('kind.pies', 'kind', 'pies', 'Pies'),
  ('kind.pizza', 'kind', 'pizza', 'Pizza'),
  ('kind.plums', 'kind', 'plums', 'Plums'),
  ('kind.pork', 'kind', 'pork', 'Pork'),
  ('kind.potatoes', 'kind', 'potatoes', 'Potatoes'),
  ('kind.preserves', 'kind', 'preserves', 'Preserves'),
  ('kind.pumpkin-pie', 'kind', 'pumpkin-pie', 'Pumpkin pie'),
  ('kind.pumpkins', 'kind', 'pumpkins', 'Pumpkins'),
  ('kind.quiche', 'kind', 'quiche', 'Quiche'),
  ('kind.radishes', 'kind', 'radishes', 'Radishes'),
  ('kind.raspberries', 'kind', 'raspberries', 'Raspberries'),
  ('kind.rhubarb', 'kind', 'rhubarb', 'Rhubarb'),
  ('kind.romaine-lettuce', 'kind', 'romaine-lettuce', 'Romaine lettuce'),
  ('kind.rosemary', 'kind', 'rosemary', 'Rosemary'),
  ('kind.sandwiches', 'kind', 'sandwiches', 'Sandwiches'),
  ('kind.sausage-roll', 'kind', 'sausage-roll', 'Sausage roll'),
  ('kind.sausages', 'kind', 'sausages', 'Sausages'),
  ('kind.scones', 'kind', 'scones', 'Scones'),
  ('kind.seafood', 'kind', 'seafood', 'Seafood'),
  ('kind.smoothies', 'kind', 'smoothies', 'Smoothies'),
  ('kind.soups', 'kind', 'soups', 'Soups'),
  ('kind.sourdough', 'kind', 'sourdough', 'Sourdough'),
  ('kind.spinach', 'kind', 'spinach', 'Spinach'),
  ('kind.squash', 'kind', 'squash', 'Squash'),
  ('kind.strawberries', 'kind', 'strawberries', 'Strawberries'),
  ('kind.summer-sausage', 'kind', 'summer-sausage', 'Summer sausage'),
  ('kind.sweet-corn', 'kind', 'sweet-corn', 'Sweet corn'),
  ('kind.sweet-potatoes', 'kind', 'sweet-potatoes', 'Sweet potatoes'),
  ('kind.tacos', 'kind', 'tacos', 'Tacos'),
  ('kind.tarts', 'kind', 'tarts', 'Tarts'),
  ('kind.tea', 'kind', 'tea', 'Tea'),
  ('kind.thyme', 'kind', 'thyme', 'Thyme'),
  ('kind.tomatoes', 'kind', 'tomatoes', 'Tomatoes'),
  ('kind.turkey', 'kind', 'turkey', 'Turkey'),
  ('kind.turnip', 'kind', 'turnip', 'Turnip'),
  ('kind.wine', 'kind', 'wine', 'Wine'),
  ('kind.zucchini', 'kind', 'zucchini', 'Zucchini'),
  ('meal.breakfast', 'meal', 'breakfast', 'Breakfast'),
  ('meal.brunch', 'meal', 'brunch', 'Brunch'),
  ('meal.dinner', 'meal', 'dinner', 'Dinner'),
  ('meal.lunch', 'meal', 'lunch', 'Lunch'),
  ('occasion.christmas', 'occasion', 'christmas', 'Christmas'),
  ('occasion.easter', 'occasion', 'easter', 'Easter'),
  ('occasion.halloween', 'occasion', 'halloween', 'Halloween'),
  ('occasion.holiday', 'occasion', 'holiday', 'Holiday'),
  ('occasion.thanksgiving', 'occasion', 'thanksgiving', 'Thanksgiving'),
  ('use.appetizer', 'use', 'appetizer', 'Appetizer'),
  ('use.baking', 'use', 'baking', 'Baking'),
  ('use.bbq', 'use', 'bbq', 'Barbecue'),
  ('use.charcuterie', 'use', 'charcuterie', 'Charcuterie'),
  ('use.condiment', 'use', 'condiment', 'Condiment'),
  ('use.dessert', 'use', 'dessert', 'Dessert'),
  ('use.drink', 'use', 'drink', 'Drink'),
  ('use.gift', 'use', 'gift', 'Gift'),
  ('use.main', 'use', 'main', 'Main'),
  ('use.pastry', 'use', 'pastry', 'Pastry'),
  ('use.picnic', 'use', 'picnic', 'Picnic'),
  ('use.preserve', 'use', 'preserve', 'Preserve'),
  ('use.produce', 'use', 'produce', 'Produce'),
  ('use.side', 'use', 'side', 'Side'),
  ('use.snack', 'use', 'snack', 'Snack');

insert into public.search_terms (term, label, source) values
  ('appetizer', 'Appetizer', 'foundation'),
  ('apple butter', 'Apple butter', 'foundation'),
  ('apple cider', 'Apple cider', 'foundation'),
  ('apple fritters', 'Apple fritters', 'foundation'),
  ('apple pie', 'Apple pie', 'foundation'),
  ('apples', 'Apples', 'foundation'),
  ('apricots', 'Apricots', 'foundation'),
  ('arugula', 'Arugula', 'foundation'),
  ('asparagus', 'Asparagus', 'foundation'),
  ('bacon', 'Bacon', 'foundation'),
  ('bagels', 'Bagels', 'foundation'),
  ('baking', 'Baking', 'foundation'),
  ('barbecue', 'Barbecue', 'foundation'),
  ('bbq', 'Barbecue', 'foundation'),
  ('beans', 'Beans', 'foundation'),
  ('bee pollen', 'Bee pollen', 'foundation'),
  ('beef', 'Beef', 'foundation'),
  ('beets', 'Beets', 'foundation'),
  ('blackberries', 'Blackberries', 'foundation'),
  ('blueberries', 'Blueberries', 'foundation'),
  ('bok choy', 'Bok choy', 'foundation'),
  ('bread', 'Bread', 'foundation'),
  ('breakfast', 'Breakfast', 'foundation'),
  ('broccoli', 'Broccoli', 'foundation'),
  ('brownies', 'Brownies', 'foundation'),
  ('brunch', 'Brunch', 'foundation'),
  ('burgers', 'Burgers', 'foundation'),
  ('butter chicken', 'Butter chicken', 'foundation'),
  ('butter tarts', 'Butter tarts', 'foundation'),
  ('cabbage', 'Cabbage', 'foundation'),
  ('cakes', 'Cakes', 'foundation'),
  ('carrots', 'Carrots', 'foundation'),
  ('cauliflower', 'Cauliflower', 'foundation'),
  ('charcuterie', 'Charcuterie', 'foundation'),
  ('cheese', 'Cheese', 'foundation'),
  ('cherries', 'Cherries', 'foundation'),
  ('chicken', 'Chicken', 'foundation'),
  ('chocolate chip cookies', 'Chocolate chip cookies', 'foundation'),
  ('christmas', 'Christmas', 'foundation'),
  ('chutneys', 'Chutneys', 'foundation'),
  ('cinnamon buns', 'Cinnamon buns', 'foundation'),
  ('coffee', 'Coffee', 'foundation'),
  ('condiment', 'Condiment', 'foundation'),
  ('cookies', 'Cookies', 'foundation'),
  ('creamed honey', 'Creamed honey', 'foundation'),
  ('croissants', 'Croissants', 'foundation'),
  ('cucumbers', 'Cucumbers', 'foundation'),
  ('dairy free', 'Dairy free', 'foundation'),
  ('dairy-free', 'Dairy-free', 'foundation'),
  ('dessert', 'Dessert', 'foundation'),
  ('desserts', 'Desserts', 'foundation'),
  ('dinner', 'Dinner', 'foundation'),
  ('donuts', 'Donuts', 'foundation'),
  ('dried fruits', 'Dried fruits', 'foundation'),
  ('drink', 'Drink', 'foundation'),
  ('drinks', 'Drinks', 'foundation'),
  ('easter', 'Easter', 'foundation'),
  ('eggplant', 'Eggplant', 'foundation'),
  ('eggs', 'Eggs', 'foundation'),
  ('focaccia', 'Focaccia', 'foundation'),
  ('fruit', 'Fruit', 'foundation'),
  ('garlic', 'Garlic', 'foundation'),
  ('gift', 'Gift', 'foundation'),
  ('gluten free', 'Gluten free', 'foundation'),
  ('gluten-free', 'Gluten-free', 'foundation'),
  ('grapes', 'Grapes', 'foundation'),
  ('halal', 'Halal', 'foundation'),
  ('halloween', 'Halloween', 'foundation'),
  ('herbs', 'Herbs', 'foundation'),
  ('holiday', 'Holiday', 'foundation'),
  ('honey', 'Honey', 'foundation'),
  ('hot sauce', 'Hot sauce', 'foundation'),
  ('ice cream', 'Ice cream', 'foundation'),
  ('jams', 'Jams', 'foundation'),
  ('jerk chicken', 'Jerk chicken', 'foundation'),
  ('kale', 'Kale', 'foundation'),
  ('keto', 'Keto', 'foundation'),
  ('lamb', 'Lamb', 'foundation'),
  ('leeks', 'Leeks', 'foundation'),
  ('lemonade', 'Lemonade', 'foundation'),
  ('lettuce', 'Lettuce', 'foundation'),
  ('lunch', 'Lunch', 'foundation'),
  ('main', 'Main', 'foundation'),
  ('maple butter', 'Maple butter', 'foundation'),
  ('maple syrup', 'Maple syrup', 'foundation'),
  ('meat pies', 'Meat pies', 'foundation'),
  ('melons', 'Melons', 'foundation'),
  ('microgreens', 'Microgreens', 'foundation'),
  ('milk', 'Milk', 'foundation'),
  ('muffins', 'Muffins', 'foundation'),
  ('mushrooms', 'Mushrooms', 'foundation'),
  ('okra', 'Okra', 'foundation'),
  ('olive oil', 'Olive oil', 'foundation'),
  ('onions', 'Onions', 'foundation'),
  ('oranges', 'Oranges', 'foundation'),
  ('organic', 'Organic', 'foundation'),
  ('parsnips', 'Parsnips', 'foundation'),
  ('pastries', 'Pastries', 'foundation'),
  ('pastry', 'Pastry', 'foundation'),
  ('peaches', 'Peaches', 'foundation'),
  ('peameal bacon', 'Peameal bacon', 'foundation'),
  ('pears', 'Pears', 'foundation'),
  ('peas', 'Peas', 'foundation'),
  ('pepperettes', 'Pepperettes', 'foundation'),
  ('peppers', 'Peppers', 'foundation'),
  ('perogies', 'Perogies', 'foundation'),
  ('pickles', 'Pickles', 'foundation'),
  ('picnic', 'Picnic', 'foundation'),
  ('pies', 'Pies', 'foundation'),
  ('pizza', 'Pizza', 'foundation'),
  ('plums', 'Plums', 'foundation'),
  ('pork', 'Pork', 'foundation'),
  ('potatoes', 'Potatoes', 'foundation'),
  ('preserve', 'Preserve', 'foundation'),
  ('preserves', 'Preserves', 'foundation'),
  ('produce', 'Produce', 'foundation'),
  ('pumpkin pie', 'Pumpkin pie', 'foundation'),
  ('pumpkins', 'Pumpkins', 'foundation'),
  ('quiche', 'Quiche', 'foundation'),
  ('radishes', 'Radishes', 'foundation'),
  ('raspberries', 'Raspberries', 'foundation'),
  ('rhubarb', 'Rhubarb', 'foundation'),
  ('sandwiches', 'Sandwiches', 'foundation'),
  ('sausage rolls', 'Sausage rolls', 'foundation'),
  ('sausages', 'Sausages', 'foundation'),
  ('scones', 'Scones', 'foundation'),
  ('seafood', 'Seafood', 'foundation'),
  ('side', 'Side', 'foundation'),
  ('sides', 'Sides', 'foundation'),
  ('smoothies', 'Smoothies', 'foundation'),
  ('snack', 'Snack', 'foundation'),
  ('snacks', 'Snacks', 'foundation'),
  ('soups', 'Soups', 'foundation'),
  ('sourdough', 'Sourdough', 'foundation'),
  ('spinach', 'Spinach', 'foundation'),
  ('squash', 'Squash', 'foundation'),
  ('strawberries', 'Strawberries', 'foundation'),
  ('sweet corn', 'Sweet corn', 'foundation'),
  ('sweet potato', 'Sweet potato', 'foundation'),
  ('sweet potatoes', 'Sweet potatoes', 'foundation'),
  ('sweets', 'Sweets', 'foundation'),
  ('tacos', 'Tacos', 'foundation'),
  ('tarts', 'Tarts', 'foundation'),
  ('tea', 'Tea', 'foundation'),
  ('thanksgiving', 'Thanksgiving', 'foundation'),
  ('tomatoes', 'Tomatoes', 'foundation'),
  ('turkey', 'Turkey', 'foundation'),
  ('turnips', 'Turnips', 'foundation'),
  ('vegan', 'Vegan', 'foundation'),
  ('vegetables', 'Vegetables', 'foundation'),
  ('vegetarian', 'Vegetarian', 'foundation'),
  ('veggies', 'Veggies', 'foundation'),
  ('wine', 'Wine', 'foundation'),
  ('zucchini', 'Zucchini', 'foundation');

insert into public.search_term_classifiers (term, classifier_slug, weight) values
  ('appetizer', 'use.appetizer', 3),
  ('apple butter', 'kind.apple-butter', 3),
  ('apple cider', 'kind.apple-cider', 3),
  ('apple fritters', 'kind.apple-fritter', 3),
  ('apple pie', 'kind.apple-pie', 3),
  ('apples', 'kind.apples', 3),
  ('apricots', 'kind.apricots', 3),
  ('arugula', 'kind.arugula', 3),
  ('asparagus', 'kind.asparagus', 3),
  ('bacon', 'kind.bacon', 3),
  ('bagels', 'kind.bagels', 3),
  ('baking', 'kind.almond-croissant', 2),
  ('baking', 'kind.bagels', 2),
  ('baking', 'kind.bread', 2),
  ('baking', 'kind.croissants', 2),
  ('baking', 'kind.focaccia', 2),
  ('baking', 'kind.muffins', 2),
  ('baking', 'kind.scones', 2),
  ('baking', 'kind.sourdough', 2),
  ('baking', 'use.baking', 3),
  ('barbecue', 'kind.beef', 2),
  ('barbecue', 'kind.burgers', 2),
  ('barbecue', 'kind.chicken', 2),
  ('barbecue', 'kind.pork', 2),
  ('barbecue', 'kind.sausages', 2),
  ('barbecue', 'use.bbq', 3),
  ('bbq', 'kind.beef', 2),
  ('bbq', 'kind.burgers', 2),
  ('bbq', 'kind.chicken', 2),
  ('bbq', 'kind.pork', 2),
  ('bbq', 'kind.sausages', 2),
  ('bbq', 'use.bbq', 3),
  ('beans', 'kind.beans', 3),
  ('beans', 'kind.green-beans', 3),
  ('bee pollen', 'kind.bee-pollen', 3),
  ('beef', 'kind.beef', 3),
  ('beef', 'kind.grass-fed-beef', 3),
  ('beets', 'kind.beets', 3),
  ('blackberries', 'kind.blackberries', 3),
  ('blueberries', 'kind.blueberries', 3),
  ('bok choy', 'kind.bok-choy', 3),
  ('bread', 'kind.bread', 3),
  ('breakfast', 'kind.bacon', 2),
  ('breakfast', 'kind.breakfast-sausage', 2),
  ('breakfast', 'kind.coffee', 2),
  ('breakfast', 'kind.eggs', 2),
  ('breakfast', 'kind.jams', 2),
  ('breakfast', 'kind.muffins', 2),
  ('breakfast', 'kind.scones', 2),
  ('breakfast', 'kind.tea', 2),
  ('breakfast', 'meal.breakfast', 3),
  ('broccoli', 'kind.broccoli', 3),
  ('brownies', 'kind.brownies', 3),
  ('brunch', 'kind.bacon', 2),
  ('brunch', 'kind.breakfast-sausage', 2),
  ('brunch', 'kind.coffee', 2),
  ('brunch', 'kind.eggs', 2),
  ('brunch', 'kind.jams', 2),
  ('brunch', 'kind.muffins', 2),
  ('brunch', 'kind.scones', 2),
  ('brunch', 'kind.tea', 2),
  ('brunch', 'meal.brunch', 3),
  ('burgers', 'kind.burgers', 3),
  ('butter chicken', 'kind.butter-chicken', 3),
  ('butter tarts', 'kind.butter-tarts', 3),
  ('cabbage', 'kind.cabbage', 3),
  ('cakes', 'kind.cakes', 3),
  ('cakes', 'kind.cheesecake', 3),
  ('cakes', 'kind.cupcakes', 3),
  ('carrots', 'kind.carrots', 3),
  ('cauliflower', 'kind.cauliflower', 3),
  ('charcuterie', 'kind.cheese', 2),
  ('charcuterie', 'kind.pepperettes', 2),
  ('charcuterie', 'kind.pickles', 2),
  ('charcuterie', 'kind.sausages', 2),
  ('charcuterie', 'use.charcuterie', 3),
  ('cheese', 'kind.cheese', 3),
  ('cherries', 'kind.cherries', 3),
  ('chicken', 'kind.chicken', 3),
  ('chicken', 'kind.free-range-chicken', 3),
  ('chocolate chip cookies', 'kind.chocolate-chip-cookies', 3),
  ('christmas', 'kind.pumpkin-pie', 2),
  ('christmas', 'occasion.christmas', 3),
  ('chutneys', 'kind.chutneys', 3),
  ('cinnamon buns', 'kind.cinnamon-buns', 3),
  ('coffee', 'kind.coffee', 3),
  ('condiment', 'kind.chutneys', 2),
  ('condiment', 'kind.hot-sauce', 2),
  ('condiment', 'kind.jams', 2),
  ('condiment', 'kind.jellies', 2),
  ('condiment', 'kind.pickles', 2),
  ('condiment', 'kind.preserves', 2),
  ('condiment', 'use.condiment', 3),
  ('cookies', 'kind.chocolate-chip-cookies', 3),
  ('cookies', 'kind.cookies', 3),
  ('creamed honey', 'kind.creamed-honey', 3),
  ('croissants', 'kind.almond-croissant', 3),
  ('croissants', 'kind.croissants', 3),
  ('cucumbers', 'kind.cucumbers', 3),
  ('dairy free', 'diet.dairy-free', 3),
  ('dairy-free', 'diet.dairy-free', 3),
  ('dessert', 'kind.apple-fritter', 2),
  ('dessert', 'kind.apple-pie', 2),
  ('dessert', 'kind.brownies', 2),
  ('dessert', 'kind.butter-tarts', 2),
  ('dessert', 'kind.cakes', 2),
  ('dessert', 'kind.cheesecake', 2),
  ('dessert', 'kind.chocolate-chip-cookies', 2),
  ('dessert', 'kind.cinnamon-buns', 2),
  ('dessert', 'kind.cookies', 2),
  ('dessert', 'kind.cupcakes', 2),
  ('dessert', 'kind.donuts', 2),
  ('dessert', 'kind.ice-cream', 2),
  ('dessert', 'kind.pastries', 2),
  ('dessert', 'kind.pies', 2),
  ('dessert', 'kind.pumpkin-pie', 2),
  ('dessert', 'kind.tarts', 2),
  ('dessert', 'use.dessert', 3),
  ('desserts', 'kind.apple-fritter', 2),
  ('desserts', 'kind.apple-pie', 2),
  ('desserts', 'kind.brownies', 2),
  ('desserts', 'kind.butter-tarts', 2),
  ('desserts', 'kind.cakes', 2),
  ('desserts', 'kind.cheesecake', 2),
  ('desserts', 'kind.chocolate-chip-cookies', 2),
  ('desserts', 'kind.cinnamon-buns', 2),
  ('desserts', 'kind.cookies', 2),
  ('desserts', 'kind.cupcakes', 2),
  ('desserts', 'kind.donuts', 2),
  ('desserts', 'kind.ice-cream', 2),
  ('desserts', 'kind.pastries', 2),
  ('desserts', 'kind.pies', 2),
  ('desserts', 'kind.pumpkin-pie', 2),
  ('desserts', 'kind.tarts', 2),
  ('desserts', 'use.dessert', 3),
  ('dinner', 'kind.burgers', 2),
  ('dinner', 'kind.butter-chicken', 2),
  ('dinner', 'kind.jerk-chicken', 2),
  ('dinner', 'kind.meat-pies', 2),
  ('dinner', 'kind.perogies', 2),
  ('dinner', 'kind.pizza', 2),
  ('dinner', 'kind.quiche', 2),
  ('dinner', 'kind.tacos', 2),
  ('dinner', 'meal.dinner', 3),
  ('donuts', 'kind.donuts', 3),
  ('dried fruits', 'kind.dried-fruits', 3),
  ('drink', 'kind.apple-cider', 2),
  ('drink', 'kind.coffee', 2),
  ('drink', 'kind.lemonade', 2),
  ('drink', 'kind.matcha', 2),
  ('drink', 'kind.smoothies', 2),
  ('drink', 'kind.tea', 2),
  ('drink', 'use.drink', 3),
  ('drinks', 'kind.apple-cider', 2),
  ('drinks', 'kind.coffee', 2),
  ('drinks', 'kind.lemonade', 2),
  ('drinks', 'kind.matcha', 2),
  ('drinks', 'kind.smoothies', 2),
  ('drinks', 'kind.tea', 2),
  ('drinks', 'use.drink', 3),
  ('easter', 'occasion.easter', 3),
  ('eggplant', 'kind.eggplant', 3),
  ('eggs', 'kind.eggs', 3),
  ('focaccia', 'kind.focaccia', 3),
  ('fruit', 'kind.apples', 3),
  ('fruit', 'kind.apricots', 3),
  ('fruit', 'kind.blackberries', 3),
  ('fruit', 'kind.blueberries', 3),
  ('fruit', 'kind.cherries', 3),
  ('fruit', 'kind.grapes', 3),
  ('fruit', 'kind.melons', 3),
  ('fruit', 'kind.nectarines', 3),
  ('fruit', 'kind.oranges', 3),
  ('fruit', 'kind.peaches', 3),
  ('fruit', 'kind.pears', 3),
  ('fruit', 'kind.plums', 3),
  ('fruit', 'kind.raspberries', 3),
  ('fruit', 'kind.rhubarb', 3),
  ('fruit', 'kind.strawberries', 3),
  ('garlic', 'kind.garlic', 3),
  ('gift', 'use.gift', 3),
  ('gluten free', 'diet.gluten-free', 3),
  ('gluten-free', 'diet.gluten-free', 3),
  ('grapes', 'kind.grapes', 3),
  ('halal', 'diet.halal', 3),
  ('halloween', 'occasion.halloween', 3),
  ('herbs', 'kind.basil', 3),
  ('herbs', 'kind.dill', 3),
  ('herbs', 'kind.herbs', 3),
  ('herbs', 'kind.parsley', 3),
  ('herbs', 'kind.rosemary', 3),
  ('herbs', 'kind.thyme', 3),
  ('holiday', 'occasion.christmas', 2),
  ('holiday', 'occasion.easter', 2),
  ('holiday', 'occasion.halloween', 2),
  ('holiday', 'occasion.holiday', 3),
  ('holiday', 'occasion.thanksgiving', 2),
  ('honey', 'kind.comb-honey', 3),
  ('honey', 'kind.honey', 3),
  ('honey', 'kind.honeycomb', 3),
  ('hot sauce', 'kind.hot-sauce', 3),
  ('ice cream', 'kind.ice-cream', 3),
  ('jams', 'kind.jams', 3),
  ('jams', 'kind.jellies', 3),
  ('jerk chicken', 'kind.jerk-chicken', 3),
  ('kale', 'kind.kale', 3),
  ('keto', 'diet.keto', 3),
  ('lamb', 'kind.lamb', 3),
  ('leeks', 'kind.leeks', 3),
  ('lemonade', 'kind.lemonade', 3),
  ('lettuce', 'kind.lettuce', 3),
  ('lettuce', 'kind.romaine-lettuce', 3),
  ('lunch', 'kind.burgers', 2),
  ('lunch', 'kind.pizza', 2),
  ('lunch', 'kind.quiche', 2),
  ('lunch', 'kind.sandwiches', 2),
  ('lunch', 'kind.soups', 2),
  ('lunch', 'kind.tacos', 2),
  ('lunch', 'meal.lunch', 3),
  ('main', 'use.main', 3),
  ('maple butter', 'kind.maple-butter', 3),
  ('maple syrup', 'kind.maple-syrup', 3),
  ('meat pies', 'kind.meat-pies', 3),
  ('melons', 'kind.melons', 3),
  ('microgreens', 'kind.broccoli-microgreens', 3),
  ('microgreens', 'kind.microgreens', 3),
  ('milk', 'kind.milk', 3),
  ('muffins', 'kind.muffins', 3),
  ('mushrooms', 'kind.mushrooms', 3),
  ('okra', 'kind.okra', 3),
  ('olive oil', 'kind.olive-oil', 3),
  ('onions', 'kind.green-onions', 3),
  ('onions', 'kind.onions', 3),
  ('oranges', 'kind.oranges', 3),
  ('organic', 'diet.organic', 3),
  ('parsnips', 'kind.parsnips', 3),
  ('pastries', 'kind.almond-croissant', 2),
  ('pastries', 'kind.apple-fritter', 2),
  ('pastries', 'kind.cinnamon-buns', 2),
  ('pastries', 'kind.croissants', 2),
  ('pastries', 'kind.donuts', 2),
  ('pastries', 'kind.pastries', 3),
  ('pastries', 'use.pastry', 3),
  ('pastry', 'kind.almond-croissant', 2),
  ('pastry', 'kind.apple-fritter', 2),
  ('pastry', 'kind.cinnamon-buns', 2),
  ('pastry', 'kind.croissants', 2),
  ('pastry', 'kind.donuts', 2),
  ('pastry', 'kind.pastries', 3),
  ('pastry', 'use.pastry', 3),
  ('peaches', 'kind.nectarines', 3),
  ('peaches', 'kind.peaches', 3),
  ('peameal bacon', 'kind.peameal-bacon', 3),
  ('pears', 'kind.pears', 3),
  ('peas', 'kind.peas', 3),
  ('pepperettes', 'kind.pepperettes', 3),
  ('peppers', 'kind.peppers', 3),
  ('perogies', 'kind.perogies', 3),
  ('pickles', 'kind.pickles', 3),
  ('picnic', 'kind.cookies', 2),
  ('picnic', 'kind.lemonade', 2),
  ('picnic', 'kind.pies', 2),
  ('picnic', 'kind.sandwiches', 2),
  ('picnic', 'use.picnic', 3),
  ('pies', 'kind.apple-pie', 3),
  ('pies', 'kind.pies', 3),
  ('pies', 'kind.pumpkin-pie', 3),
  ('pizza', 'kind.pizza', 3),
  ('plums', 'kind.plums', 3),
  ('pork', 'kind.pork', 3),
  ('potatoes', 'kind.potatoes', 3),
  ('preserve', 'kind.jams', 2),
  ('preserve', 'kind.jellies', 2),
  ('preserve', 'kind.pickles', 2),
  ('preserve', 'kind.preserves', 2),
  ('preserve', 'use.preserve', 3),
  ('preserves', 'kind.preserves', 3),
  ('produce', 'kind.apples', 2),
  ('produce', 'kind.apricots', 2),
  ('produce', 'kind.arugula', 2),
  ('produce', 'kind.asparagus', 2),
  ('produce', 'kind.basil', 2),
  ('produce', 'kind.beans', 2),
  ('produce', 'kind.beets', 2),
  ('produce', 'kind.blackberries', 2),
  ('produce', 'kind.blueberries', 2),
  ('produce', 'kind.bok-choy', 2),
  ('produce', 'kind.broccoli', 2),
  ('produce', 'kind.broccoli-microgreens', 2),
  ('produce', 'kind.cabbage', 2),
  ('produce', 'kind.carrots', 2),
  ('produce', 'kind.cauliflower', 2),
  ('produce', 'kind.cherries', 2),
  ('produce', 'kind.cherry-tomatoes', 2),
  ('produce', 'kind.corn', 2),
  ('produce', 'kind.cucumbers', 2),
  ('produce', 'kind.dill', 2),
  ('produce', 'kind.eggplant', 2),
  ('produce', 'kind.garlic', 2),
  ('produce', 'kind.grapes', 2),
  ('produce', 'kind.green-beans', 2),
  ('produce', 'kind.green-onions', 2),
  ('produce', 'kind.heirloom-tomatoes', 2),
  ('produce', 'kind.herbs', 2),
  ('produce', 'kind.kale', 2),
  ('produce', 'kind.leeks', 2),
  ('produce', 'kind.lettuce', 2),
  ('produce', 'kind.melons', 2),
  ('produce', 'kind.microgreens', 2),
  ('produce', 'kind.mushrooms', 2),
  ('produce', 'kind.nectarines', 2),
  ('produce', 'kind.okra', 2),
  ('produce', 'kind.onions', 2),
  ('produce', 'kind.oranges', 2),
  ('produce', 'kind.parsley', 2),
  ('produce', 'kind.parsnips', 2),
  ('produce', 'kind.peaches', 2),
  ('produce', 'kind.pears', 2),
  ('produce', 'kind.peas', 2),
  ('produce', 'kind.peppers', 2),
  ('produce', 'kind.plums', 2),
  ('produce', 'kind.potatoes', 2),
  ('produce', 'kind.pumpkins', 2),
  ('produce', 'kind.radishes', 2),
  ('produce', 'kind.raspberries', 2),
  ('produce', 'kind.rhubarb', 2),
  ('produce', 'kind.romaine-lettuce', 2),
  ('produce', 'kind.rosemary', 2),
  ('produce', 'kind.spinach', 2),
  ('produce', 'kind.squash', 2),
  ('produce', 'kind.strawberries', 2),
  ('produce', 'kind.sweet-corn', 2),
  ('produce', 'kind.sweet-potatoes', 2),
  ('produce', 'kind.thyme', 2),
  ('produce', 'kind.tomatoes', 2),
  ('produce', 'kind.turnip', 2),
  ('produce', 'kind.zucchini', 2),
  ('produce', 'use.produce', 3),
  ('pumpkin pie', 'kind.pumpkin-pie', 3),
  ('pumpkins', 'kind.pumpkins', 3),
  ('quiche', 'kind.quiche', 3),
  ('radishes', 'kind.radishes', 3),
  ('raspberries', 'kind.raspberries', 3),
  ('rhubarb', 'kind.rhubarb', 3),
  ('sandwiches', 'kind.sandwiches', 3),
  ('sausage rolls', 'kind.sausage-roll', 3),
  ('sausages', 'kind.breakfast-sausage', 3),
  ('sausages', 'kind.sausages', 3),
  ('sausages', 'kind.summer-sausage', 3),
  ('scones', 'kind.scones', 3),
  ('seafood', 'kind.seafood', 3),
  ('side', 'kind.arugula', 2),
  ('side', 'kind.asparagus', 2),
  ('side', 'kind.basil', 2),
  ('side', 'kind.beans', 2),
  ('side', 'kind.beets', 2),
  ('side', 'kind.bok-choy', 2),
  ('side', 'kind.broccoli', 2),
  ('side', 'kind.broccoli-microgreens', 2),
  ('side', 'kind.cabbage', 2),
  ('side', 'kind.carrots', 2),
  ('side', 'kind.cauliflower', 2),
  ('side', 'kind.cherry-tomatoes', 2),
  ('side', 'kind.corn', 2),
  ('side', 'kind.cucumbers', 2),
  ('side', 'kind.dill', 2),
  ('side', 'kind.eggplant', 2),
  ('side', 'kind.garlic', 2),
  ('side', 'kind.green-beans', 2),
  ('side', 'kind.green-onions', 2),
  ('side', 'kind.heirloom-tomatoes', 2),
  ('side', 'kind.herbs', 2),
  ('side', 'kind.kale', 2),
  ('side', 'kind.leeks', 2),
  ('side', 'kind.lettuce', 2),
  ('side', 'kind.microgreens', 2),
  ('side', 'kind.mushrooms', 2),
  ('side', 'kind.okra', 2),
  ('side', 'kind.onions', 2),
  ('side', 'kind.parsley', 2),
  ('side', 'kind.parsnips', 2),
  ('side', 'kind.peas', 2),
  ('side', 'kind.peppers', 2),
  ('side', 'kind.potatoes', 2),
  ('side', 'kind.pumpkins', 2),
  ('side', 'kind.radishes', 2),
  ('side', 'kind.romaine-lettuce', 2),
  ('side', 'kind.rosemary', 2),
  ('side', 'kind.spinach', 2),
  ('side', 'kind.squash', 2),
  ('side', 'kind.sweet-corn', 2),
  ('side', 'kind.sweet-potatoes', 2),
  ('side', 'kind.thyme', 2),
  ('side', 'kind.tomatoes', 2),
  ('side', 'kind.turnip', 2),
  ('side', 'kind.zucchini', 2),
  ('side', 'use.side', 3),
  ('sides', 'kind.arugula', 2),
  ('sides', 'kind.asparagus', 2),
  ('sides', 'kind.basil', 2),
  ('sides', 'kind.beans', 2),
  ('sides', 'kind.beets', 2),
  ('sides', 'kind.bok-choy', 2),
  ('sides', 'kind.broccoli', 2),
  ('sides', 'kind.broccoli-microgreens', 2),
  ('sides', 'kind.cabbage', 2),
  ('sides', 'kind.carrots', 2),
  ('sides', 'kind.cauliflower', 2),
  ('sides', 'kind.cherry-tomatoes', 2),
  ('sides', 'kind.corn', 2),
  ('sides', 'kind.cucumbers', 2),
  ('sides', 'kind.dill', 2),
  ('sides', 'kind.eggplant', 2),
  ('sides', 'kind.garlic', 2),
  ('sides', 'kind.green-beans', 2),
  ('sides', 'kind.green-onions', 2),
  ('sides', 'kind.heirloom-tomatoes', 2),
  ('sides', 'kind.herbs', 2),
  ('sides', 'kind.kale', 2),
  ('sides', 'kind.leeks', 2),
  ('sides', 'kind.lettuce', 2),
  ('sides', 'kind.microgreens', 2),
  ('sides', 'kind.mushrooms', 2),
  ('sides', 'kind.okra', 2),
  ('sides', 'kind.onions', 2),
  ('sides', 'kind.parsley', 2),
  ('sides', 'kind.parsnips', 2),
  ('sides', 'kind.peas', 2),
  ('sides', 'kind.peppers', 2),
  ('sides', 'kind.potatoes', 2),
  ('sides', 'kind.pumpkins', 2),
  ('sides', 'kind.radishes', 2),
  ('sides', 'kind.romaine-lettuce', 2),
  ('sides', 'kind.rosemary', 2),
  ('sides', 'kind.spinach', 2),
  ('sides', 'kind.squash', 2),
  ('sides', 'kind.sweet-corn', 2),
  ('sides', 'kind.sweet-potatoes', 2),
  ('sides', 'kind.thyme', 2),
  ('sides', 'kind.tomatoes', 2),
  ('sides', 'kind.turnip', 2),
  ('sides', 'kind.zucchini', 2),
  ('sides', 'use.side', 3),
  ('smoothies', 'kind.smoothies', 3),
  ('snack', 'kind.dried-fruits', 2),
  ('snack', 'kind.pepperettes', 2),
  ('snack', 'use.snack', 3),
  ('snacks', 'kind.dried-fruits', 2),
  ('snacks', 'kind.pepperettes', 2),
  ('snacks', 'use.snack', 3),
  ('soups', 'kind.soups', 3),
  ('sourdough', 'kind.sourdough', 3),
  ('spinach', 'kind.spinach', 3),
  ('squash', 'kind.squash', 3),
  ('strawberries', 'kind.strawberries', 3),
  ('sweet corn', 'kind.corn', 3),
  ('sweet corn', 'kind.sweet-corn', 3),
  ('sweet potato', 'kind.sweet-potatoes', 3),
  ('sweet potatoes', 'kind.sweet-potatoes', 3),
  ('sweets', 'kind.apple-fritter', 2),
  ('sweets', 'kind.apple-pie', 2),
  ('sweets', 'kind.brownies', 2),
  ('sweets', 'kind.butter-tarts', 2),
  ('sweets', 'kind.cakes', 2),
  ('sweets', 'kind.cheesecake', 2),
  ('sweets', 'kind.chocolate-chip-cookies', 2),
  ('sweets', 'kind.cinnamon-buns', 2),
  ('sweets', 'kind.cookies', 2),
  ('sweets', 'kind.cupcakes', 2),
  ('sweets', 'kind.donuts', 2),
  ('sweets', 'kind.ice-cream', 2),
  ('sweets', 'kind.pastries', 2),
  ('sweets', 'kind.pies', 2),
  ('sweets', 'kind.pumpkin-pie', 2),
  ('sweets', 'kind.tarts', 2),
  ('sweets', 'use.dessert', 3),
  ('tacos', 'kind.tacos', 3),
  ('tarts', 'kind.tarts', 3),
  ('tea', 'kind.matcha', 3),
  ('tea', 'kind.tea', 3),
  ('thanksgiving', 'kind.apple-cider', 2),
  ('thanksgiving', 'kind.pumpkin-pie', 2),
  ('thanksgiving', 'kind.pumpkins', 2),
  ('thanksgiving', 'kind.squash', 2),
  ('thanksgiving', 'kind.sweet-potatoes', 2),
  ('thanksgiving', 'kind.turkey', 2),
  ('thanksgiving', 'occasion.thanksgiving', 3),
  ('tomatoes', 'kind.cherry-tomatoes', 3),
  ('tomatoes', 'kind.heirloom-tomatoes', 3),
  ('tomatoes', 'kind.tomatoes', 3),
  ('turkey', 'kind.turkey', 3),
  ('turnips', 'kind.turnip', 3),
  ('vegan', 'diet.vegan', 3),
  ('vegetables', 'kind.arugula', 3),
  ('vegetables', 'kind.asparagus', 3),
  ('vegetables', 'kind.basil', 3),
  ('vegetables', 'kind.beans', 3),
  ('vegetables', 'kind.beets', 3),
  ('vegetables', 'kind.bok-choy', 3),
  ('vegetables', 'kind.broccoli', 3),
  ('vegetables', 'kind.broccoli-microgreens', 3),
  ('vegetables', 'kind.cabbage', 3),
  ('vegetables', 'kind.carrots', 3),
  ('vegetables', 'kind.cauliflower', 3),
  ('vegetables', 'kind.cherry-tomatoes', 3),
  ('vegetables', 'kind.corn', 3),
  ('vegetables', 'kind.cucumbers', 3),
  ('vegetables', 'kind.dill', 3),
  ('vegetables', 'kind.eggplant', 3),
  ('vegetables', 'kind.garlic', 3),
  ('vegetables', 'kind.green-beans', 3),
  ('vegetables', 'kind.green-onions', 3),
  ('vegetables', 'kind.heirloom-tomatoes', 3),
  ('vegetables', 'kind.herbs', 3),
  ('vegetables', 'kind.kale', 3),
  ('vegetables', 'kind.leeks', 3),
  ('vegetables', 'kind.lettuce', 3),
  ('vegetables', 'kind.microgreens', 3),
  ('vegetables', 'kind.mushrooms', 3),
  ('vegetables', 'kind.okra', 3),
  ('vegetables', 'kind.onions', 3),
  ('vegetables', 'kind.parsley', 3),
  ('vegetables', 'kind.parsnips', 3),
  ('vegetables', 'kind.peas', 3),
  ('vegetables', 'kind.peppers', 3),
  ('vegetables', 'kind.potatoes', 3),
  ('vegetables', 'kind.pumpkins', 3),
  ('vegetables', 'kind.radishes', 3),
  ('vegetables', 'kind.romaine-lettuce', 3),
  ('vegetables', 'kind.rosemary', 3),
  ('vegetables', 'kind.spinach', 3),
  ('vegetables', 'kind.squash', 3),
  ('vegetables', 'kind.sweet-corn', 3),
  ('vegetables', 'kind.sweet-potatoes', 3),
  ('vegetables', 'kind.thyme', 3),
  ('vegetables', 'kind.tomatoes', 3),
  ('vegetables', 'kind.turnip', 3),
  ('vegetables', 'kind.zucchini', 3),
  ('vegetarian', 'diet.vegetarian', 3),
  ('veggies', 'kind.arugula', 3),
  ('veggies', 'kind.asparagus', 3),
  ('veggies', 'kind.basil', 3),
  ('veggies', 'kind.beans', 3),
  ('veggies', 'kind.beets', 3),
  ('veggies', 'kind.bok-choy', 3),
  ('veggies', 'kind.broccoli', 3),
  ('veggies', 'kind.broccoli-microgreens', 3),
  ('veggies', 'kind.cabbage', 3),
  ('veggies', 'kind.carrots', 3),
  ('veggies', 'kind.cauliflower', 3),
  ('veggies', 'kind.cherry-tomatoes', 3),
  ('veggies', 'kind.corn', 3),
  ('veggies', 'kind.cucumbers', 3),
  ('veggies', 'kind.dill', 3),
  ('veggies', 'kind.eggplant', 3),
  ('veggies', 'kind.garlic', 3),
  ('veggies', 'kind.green-beans', 3),
  ('veggies', 'kind.green-onions', 3),
  ('veggies', 'kind.heirloom-tomatoes', 3),
  ('veggies', 'kind.herbs', 3),
  ('veggies', 'kind.kale', 3),
  ('veggies', 'kind.leeks', 3),
  ('veggies', 'kind.lettuce', 3),
  ('veggies', 'kind.microgreens', 3),
  ('veggies', 'kind.mushrooms', 3),
  ('veggies', 'kind.okra', 3),
  ('veggies', 'kind.onions', 3),
  ('veggies', 'kind.parsley', 3),
  ('veggies', 'kind.parsnips', 3),
  ('veggies', 'kind.peas', 3),
  ('veggies', 'kind.peppers', 3),
  ('veggies', 'kind.potatoes', 3),
  ('veggies', 'kind.pumpkins', 3),
  ('veggies', 'kind.radishes', 3),
  ('veggies', 'kind.romaine-lettuce', 3),
  ('veggies', 'kind.rosemary', 3),
  ('veggies', 'kind.spinach', 3),
  ('veggies', 'kind.squash', 3),
  ('veggies', 'kind.sweet-corn', 3),
  ('veggies', 'kind.sweet-potatoes', 3),
  ('veggies', 'kind.thyme', 3),
  ('veggies', 'kind.tomatoes', 3),
  ('veggies', 'kind.turnip', 3),
  ('veggies', 'kind.zucchini', 3),
  ('wine', 'kind.wine', 3),
  ('zucchini', 'kind.zucchini', 3);

-- Canonical find-page slugs become kind assignments. One-off slugs stay for the bots.
insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug, source)
select vm.id, 'kind.' || vm.product_slug, 'slug_bootstrap'
from public.vendor_menus vm
where vm.product_slug is not null
  and exists (
    select 1
    from public.menu_classifiers c
    where c.slug = 'kind.' || vm.product_slug
  );

-- Diet labels already stored on the item.
insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug, source)
select distinct vm.id, 'diet.' || diet.value, 'diet_bootstrap'
from public.vendor_menus vm
cross join lateral unnest(coalesce(vm.dietary, '{}')) as diet(value)
where exists (
  select 1
  from public.menu_classifiers c
  where c.slug = 'diet.' || diet.value
);
