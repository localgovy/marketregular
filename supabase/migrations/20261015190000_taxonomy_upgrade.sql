-- Taxonomy upgrade: new product_category values (including pet-food),
-- extra classifier facets, plural fallback, non-food classified search,
-- and ranking so a name hit does not outrank a weight-3 tag match.
--
-- The live check vendor_menus_product_category_chk was created in the
-- database, not an earlier repo migration. Drop and recreate so every
-- previous value still passes, plus pet-food and the new categories.
--
-- Pet-food items match only when the query is pet-related
-- (dog, cat, pet, puppy, kitten, chew, kibble, and their plurals).
-- People-food queries such as turkey, pumpkin, beef, or dessert never return them.

alter table public.vendor_menus
  drop constraint if exists vendor_menus_product_category_chk;

alter table public.vendor_menus
  add constraint vendor_menus_product_category_chk
  check (
    product_category is null
    or product_category = any (array[
      'bread-and-bakery'::text,
      'eggs'::text,
      'honey'::text,
      'cheese-and-dairy'::text,
      'maple'::text,
      'apples-and-fruit'::text,
      'vegetables'::text,
      'meat-and-turkey'::text,
      'pies-and-sweets'::text,
      'prepared-foods'::text,
      'preserves-and-sauces'::text,
      'coffee-and-tea'::text,
      'plants-and-flowers'::text,
      'alcohol'::text,
      'seafood'::text,
      'flour-and-grains'::text,
      'nuts-and-snacks'::text,
      'beverages'::text,
      'body-care'::text,
      'candles-and-crafts'::text,
      'jewellery-and-accessories'::text,
      'other'::text,
      'pet-food'::text,
      'clothing-and-accessories'::text,
      'home-and-kitchen'::text,
      'art-and-stationery'::text,
      'toys-and-kids'::text,
      'health-and-wellness'::text,
      'services'::text,
      'garden-and-outdoor'::text,
      'spices-and-seasonings'::text,
      'oils-and-vinegars'::text
    ])
  );

alter table public.menu_classifiers
  drop constraint if exists menu_classifiers_facet_check;

alter table public.menu_classifiers
  add constraint menu_classifiers_facet_check
  check (
    facet = any (array[
      'kind'::text,
      'use'::text,
      'occasion'::text,
      'meal'::text,
      'ingredient'::text,
      'diet'::text,
      'origin'::text,
      'material'::text,
      'audience'::text,
      'format'::text,
      'production'::text,
      'style'::text
    ])
  );

comment on table public.menu_classifiers is
  'Allowed classifier values. Facet is fixed. Bots insert values. Slug is facet.value. kind covers food and goods.';

comment on table public.search_terms is
  'General search phrases. The full query wins over a split. There is no stemmer. search_query_parts tries s, es, and ies→y when the typed phrase is not a term.';

insert into public.menu_classifiers (slug, facet, value, label) values
  ('origin.indian', 'origin', 'indian', 'Indian'),
  ('origin.mexican', 'origin', 'mexican', 'Mexican'),
  ('origin.jamaican', 'origin', 'jamaican', 'Jamaican'),
  ('origin.caribbean', 'origin', 'caribbean', 'Caribbean'),
  ('origin.italian', 'origin', 'italian', 'Italian'),
  ('origin.chinese', 'origin', 'chinese', 'Chinese'),
  ('origin.korean', 'origin', 'korean', 'Korean'),
  ('origin.japanese', 'origin', 'japanese', 'Japanese'),
  ('origin.thai', 'origin', 'thai', 'Thai'),
  ('origin.vietnamese', 'origin', 'vietnamese', 'Vietnamese'),
  ('origin.filipino', 'origin', 'filipino', 'Filipino'),
  ('origin.middle-eastern', 'origin', 'middle-eastern', 'Middle eastern'),
  ('origin.lebanese', 'origin', 'lebanese', 'Lebanese'),
  ('origin.greek', 'origin', 'greek', 'Greek'),
  ('origin.ethiopian', 'origin', 'ethiopian', 'Ethiopian'),
  ('origin.ukrainian', 'origin', 'ukrainian', 'Ukrainian'),
  ('origin.polish', 'origin', 'polish', 'Polish'),
  ('origin.portuguese', 'origin', 'portuguese', 'Portuguese'),
  ('origin.latin-american', 'origin', 'latin-american', 'Latin american'),
  ('origin.ontario', 'origin', 'ontario', 'Ontario'),
  ('origin.quebec', 'origin', 'quebec', 'Quebec'),
  ('origin.niagara', 'origin', 'niagara', 'Niagara'),
  ('origin.local', 'origin', 'local', 'Local'),
  ('material.sterling-silver', 'material', 'sterling-silver', 'Sterling silver'),
  ('material.gold', 'material', 'gold', 'Gold'),
  ('material.gemstone', 'material', 'gemstone', 'Gemstone'),
  ('material.pearl', 'material', 'pearl', 'Pearl'),
  ('material.beeswax', 'material', 'beeswax', 'Beeswax'),
  ('material.soy-wax', 'material', 'soy-wax', 'Soy wax'),
  ('material.cotton', 'material', 'cotton', 'Cotton'),
  ('material.linen', 'material', 'linen', 'Linen'),
  ('material.wool', 'material', 'wool', 'Wool'),
  ('material.alpaca', 'material', 'alpaca', 'Alpaca'),
  ('material.leather', 'material', 'leather', 'Leather'),
  ('material.ceramic', 'material', 'ceramic', 'Ceramic'),
  ('material.glass', 'material', 'glass', 'Glass'),
  ('material.wood', 'material', 'wood', 'Wood'),
  ('material.bamboo', 'material', 'bamboo', 'Bamboo'),
  ('material.resin', 'material', 'resin', 'Resin'),
  ('audience.women', 'audience', 'women', 'Women'),
  ('audience.men', 'audience', 'men', 'Men'),
  ('audience.kids', 'audience', 'kids', 'Kids'),
  ('audience.baby', 'audience', 'baby', 'Baby'),
  ('audience.pets', 'audience', 'pets', 'Pets'),
  ('audience.unisex', 'audience', 'unisex', 'Unisex'),
  ('format.frozen', 'format', 'frozen', 'Frozen'),
  ('format.ready-to-eat', 'format', 'ready-to-eat', 'Ready to eat'),
  ('format.heat-and-serve', 'format', 'heat-and-serve', 'Heat and serve'),
  ('format.bulk', 'format', 'bulk', 'Bulk'),
  ('format.gift-set', 'format', 'gift-set', 'Gift set'),
  ('format.sampler', 'format', 'sampler', 'Sampler'),
  ('format.single', 'format', 'single', 'Single'),
  ('format.dozen', 'format', 'dozen', 'Dozen'),
  ('format.pack', 'format', 'pack', 'Pack'),
  ('format.refill', 'format', 'refill', 'Refill'),
  ('format.subscription', 'format', 'subscription', 'Subscription'),
  ('production.wild', 'production', 'wild', 'Wild'),
  ('production.foraged', 'production', 'foraged', 'Foraged'),
  ('production.pasture-raised', 'production', 'pasture-raised', 'Pasture-raised'),
  ('production.grass-fed', 'production', 'grass-fed', 'Grass-fed'),
  ('production.free-range', 'production', 'free-range', 'Free-range'),
  ('production.small-batch', 'production', 'small-batch', 'Small-batch'),
  ('production.handmade', 'production', 'handmade', 'Handmade'),
  ('production.organic', 'production', 'organic', 'Organic'),
  ('production.fair-trade', 'production', 'fair-trade', 'Fair-trade'),
  ('production.zero-waste', 'production', 'zero-waste', 'Zero-waste'),
  ('style.hazy', 'style', 'hazy', 'Hazy'),
  ('style.barrel-aged', 'style', 'barrel-aged', 'Barrel-aged'),
  ('style.dry', 'style', 'dry', 'Dry'),
  ('style.sweet', 'style', 'sweet', 'Sweet'),
  ('style.vqa', 'style', 'vqa', 'VQA'),
  ('style.light-roast', 'style', 'light-roast', 'Light roast'),
  ('style.medium-roast', 'style', 'medium-roast', 'Medium roast'),
  ('style.dark-roast', 'style', 'dark-roast', 'Dark roast'),
  ('style.aged', 'style', 'aged', 'Aged')
on conflict (slug) do nothing;

create or replace function public.search_term_match(raw text)
returns text
language sql
stable
set search_path = public
as $fn$
  select t.term
  from (
    select lower(btrim(coalesce(raw, ''))) as phrase
  ) input
  cross join lateral (
    select input.phrase as candidate, 0 as ord
    where input.phrase <> ''
    union all
    select input.phrase || 's', 1
    where input.phrase <> ''
    union all
    select input.phrase || 'es', 2
    where input.phrase <> ''
    union all
    select left(input.phrase, char_length(input.phrase) - 3) || 'y', 3
    where input.phrase ~ '[a-z]{2,}ies$'
    union all
    select left(input.phrase, char_length(input.phrase) - 1), 4
    where input.phrase ~ '[a-z]s$'
      and input.phrase !~ 'ss$'
    union all
    select left(input.phrase, char_length(input.phrase) - 2), 5
    where input.phrase ~ '[a-z]{2,}es$'
    union all
    select left(input.phrase, char_length(input.phrase) - 1) || 'ies', 6
    where input.phrase ~ '[^aeiou]y$'
      and char_length(input.phrase) > 2
  ) variants
  join public.search_terms t on t.term = variants.candidate
  order by variants.ord
  limit 1;
$fn$;

revoke all on function public.search_term_match(text) from public, anon, authenticated;
grant execute on function public.search_term_match(text) to service_role;

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
  matched text;
  found boolean;
  ord integer := 0;
begin
  if raw = '' then
    return;
  end if;

  matched := public.search_term_match(raw);
  if matched is not null then
    part_kind := 'term';
    part_value := matched;
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
      if phrase <> '' then
        matched := public.search_term_match(phrase);
        if matched is not null then
          ord := ord + 1;
          part_kind := 'term';
          part_value := matched;
          part_ord := ord;
          return next;
          i := j + 1;
          found := true;
          exit;
        end if;
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
        'clothing', 'clothes', 'apparel',
        'toy', 'toys',
        'pottery',
        'skincare',
        'earring', 'earrings',
        'necklace', 'necklaces',
        'bracelet', 'bracelets',
        'ring', 'rings',
        'pendant', 'pendants',
        'shirt', 'shirts',
        'tee', 'tees', 'tshirt', 'tshirts',
        'hoodie', 'hoodies',
        'sweater', 'sweaters',
        'hat', 'hats',
        'toque', 'toques',
        'sock', 'socks',
        'scarf', 'scarves',
        'bag', 'bags',
        'tote', 'totes',
        'purse', 'purses',
        'wallet', 'wallets',
        'mug', 'mugs',
        'ceramic', 'ceramics',
        'vase', 'vases',
        'glass', 'glasses',
        'board', 'boards',
        'towel', 'towels',
        'apron', 'aprons',
        'decor',
        'pillow', 'pillows',
        'blanket', 'blankets',
        'card', 'cards',
        'sticker', 'stickers',
        'print', 'prints',
        'painting', 'paintings',
        'book', 'books',
        'puzzle', 'puzzles',
        'game', 'games',
        'kids',
        'baby',
        'houseplant', 'houseplants',
        'succulent', 'succulents',
        'cactus', 'cacti',
        'seedling', 'seedlings',
        'bouquet', 'bouquets',
        'wreath', 'wreaths',
        'incense',
        'deodorant',
        'shampoo',
        'bath',
        'perfume', 'perfumes',
        'diffuser', 'diffusers',
        'cbd',
        'repair', 'repairs',
        'alteration', 'alterations',
        'workshop', 'workshops',
        'class', 'classes',
        'compost',
        'soil',
        'grill', 'grills'
      )
      or word like 'jewel%'
    ) as allow
    from clock
  ),
  pet_query as (
    select exists (
      select 1
      from regexp_split_to_table(lower(clock.query), '[^a-z0-9]+') as word
      where word in (
        'dog', 'dogs',
        'cat', 'cats',
        'pet', 'pets',
        'puppy', 'puppies',
        'kitten', 'kittens',
        'chew', 'chews',
        'kibble'
      )
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
          when (select yes from has_terms) then
            case
              when exists (
                select 1
                from query_parts parts
                join public.search_term_classifiers stc
                  on stc.term = parts.part_value
                 and stc.weight = 3
                join public.vendor_menu_classifier_assignments a
                  on a.menu_id = vm.id
                 and a.classifier_slug = stc.classifier_slug
                where parts.part_kind = 'term'
              ) then 1000
              else 0
            end
          when position(lower(clock.query) in lower(coalesce(vm.name, ''))) > 0 then 1000
          else 0
        end
        + case
          when (select yes from has_terms)
            and position(lower(clock.query) in lower(coalesce(vm.name, ''))) > 0
          then 300
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
        (
          vm.product_category = 'pet-food'
          and (select pet_query.allow from pet_query)
        )
        or (
          vm.product_category is distinct from 'pet-food'
          and (
            match.classified
            or (select nonfood.allow from nonfood)
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
              'beverages',
              'spices-and-seasonings',
              'oils-and-vinegars',
              'clothing-and-accessories',
              'home-and-kitchen',
              'art-and-stationery',
              'toys-and-kids',
              'health-and-wellness',
              'services',
              'garden-and-outdoor'
            )
          )
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
