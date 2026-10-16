-- Fold accents in product search, and keep the alcohol category out of food queries.
--
-- unaccent(text) is stable, so fold_search_text pins the extensions.unaccent
-- dictionary and is immutable. Queries and names both go through it, including
-- the trigram similarity and % checks, so 'rosé' and 'rose', 'crème fraîche'
-- and 'creme fraiche', and 'jalapeño' and 'jalapeno' match each other.
-- An exact folded term beats a plural variant, so 'rose' resolves to the
-- term 'rosé' rather than the flower term 'roses'.
--
-- Alcohol rows follow the pet-food gate. They stay out unless the query has
-- an alcohol word (beer, wine, cider, spirit, vodka, gin, rum, whisky,
-- liqueur, moonshine, mead, seltzer, and the plurals) or matches an alcohol
-- classifier term already stored on search_term_classifiers. Vendor tags
-- beer, cider, and wine are in that word list. 'cider', 'wine', and 'gin'
-- still return alcohol.
--
-- Do not apply from the app deploy; run as a reviewed migration.

create extension if not exists unaccent with schema extensions;

create or replace function public.fold_search_text(input text)
returns text
language sql
immutable
parallel safe
strict
security invoker
set search_path = public, extensions
as $fn$
  select extensions.unaccent('extensions.unaccent'::regdictionary, lower(input));
$fn$;

revoke all on function public.fold_search_text(text) from public, anon, authenticated;
grant execute on function public.fold_search_text(text) to service_role;

grant usage on schema extensions to service_role;
grant execute on function extensions.unaccent(regdictionary, text) to service_role;
grant execute on function extensions.unaccent(text) to service_role;

create or replace function public.search_term_match(raw text)
returns text
language sql
stable
security invoker
set search_path = public
as $fn$
  select t.term
  from (
    select public.fold_search_text(left(btrim(coalesce(raw, '')), 80)) as phrase
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
  join public.search_terms t
    on public.fold_search_text(t.term) = variants.candidate
  order by variants.ord, (public.fold_search_text(t.term) = t.term) desc, t.term
  limit 1;
$fn$;

revoke all on function public.search_term_match(text) from public, anon, authenticated;
grant execute on function public.search_term_match(text) to service_role;

create or replace function public.search_query_parts(q text)
returns table (part_kind text, part_value text, part_ord integer)
language plpgsql
stable
security invoker
set search_path = public
as $fn$
declare
  raw text := public.fold_search_text(left(btrim(coalesce(q, '')), 80));
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
      public.fold_search_text(left(btrim(coalesce(q, '')), 80)) as query,
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
  alcohol_kinds as (
    select slug
    from (
      values
        ('kind.beer'),
        ('kind.ipa'),
        ('kind.lager'),
        ('kind.sour-beer'),
        ('kind.stout'),
        ('kind.hard-cider'),
        ('kind.gin'),
        ('kind.liqueur'),
        ('kind.rum'),
        ('kind.vodka'),
        ('kind.whisky'),
        ('kind.dessert-wine'),
        ('kind.fruit-wine'),
        ('kind.mead'),
        ('kind.cocktails'),
        ('kind.sparkling-wine'),
        ('kind.red-wine'),
        ('kind.rose-wine'),
        ('kind.white-wine'),
        ('kind.wine')
    ) as kind(slug)
  ),
  alcohol_query as (
    select (
      exists (
        select 1
        from regexp_split_to_table(clock.query, '[^a-z0-9]+') as word
        where word <> ''
          and (
            word in (
              'beer', 'beers',
              'wine', 'wines',
              'cider', 'ciders',
              'spirit', 'spirits',
              'vodka', 'vodkas',
              'gin', 'gins',
              'rum', 'rums',
              'whisky', 'whiskey', 'whiskies', 'whiskeys',
              'liqueur', 'liqueurs',
              'moonshine',
              'mead',
              'seltzer', 'seltzers',
              'alcohol', 'alcoholic', 'booze', 'liquor'
            )
            or exists (
              select 1
              from public.search_term_classifiers stc
              join alcohol_kinds kinds
                on kinds.slug = stc.classifier_slug
              where public.fold_search_text(stc.term) = word
            )
          )
      )
      or exists (
        select 1
        from query_parts parts
        join public.search_term_classifiers stc
          on public.fold_search_text(stc.term) = public.fold_search_text(parts.part_value)
        join alcohol_kinds kinds
          on kinds.slug = stc.classifier_slug
      )
    ) as allow
    from clock
  ),
  goods_kinds as (
    select slug
    from (
      values

        ('kind.candles'),
        ('kind.incense'),
        ('kind.earrings'),
        ('kind.necklaces'),
        ('kind.bracelets'),
        ('kind.rings'),
        ('kind.hair-accessories'),
        ('kind.keychains'),
        ('kind.tops'),
        ('kind.sweaters'),
        ('kind.dresses-bottoms'),
        ('kind.hats-scarves'),
        ('kind.socks'),
        ('kind.bags'),
        ('kind.leather-goods'),
        ('kind.pottery'),
        ('kind.glassware'),
        ('kind.woodwork'),
        ('kind.kitchen-textiles'),
        ('kind.home-decor'),
        ('kind.art'),
        ('kind.cards-stationery'),
        ('kind.books'),
        ('kind.toys'),
        ('kind.baby-goods'),
        ('kind.crochet-knit'),
        ('kind.gift-cards'),
        ('kind.repairs'),
        ('kind.workshops'),
        ('kind.houseplants'),
        ('kind.seedlings'),
        ('kind.seeds'),
        ('kind.cut-flowers'),
        ('kind.dried-flowers'),
        ('kind.wreaths'),
        ('kind.garden-supplies'),
        ('kind.grills'),
        ('kind.pet-accessories'),
        ('kind.soap'),
        ('kind.skincare'),
        ('kind.lip-balm'),
        ('kind.bath'),
        ('kind.essential-oils'),
        ('kind.deodorant'),
        ('kind.hair-care'),
        ('kind.cbd'),
        ('kind.zero-waste')
    ) as kind(slug)
  ),
  goods_term_query as (
    select
      exists (
        select 1
        from query_parts parts
        join public.search_term_classifiers stc
          on stc.term = parts.part_value
         and stc.weight = 3
        join goods_kinds kinds
          on kinds.slug = stc.classifier_slug
        where parts.part_kind = 'term'
      )
      and not exists (
        select 1
        from query_parts parts
        where parts.part_kind = 'word'
      )
      and not exists (
        select 1
        from query_parts parts
        where parts.part_kind = 'term'
          and (
            not exists (
              select 1
              from public.search_term_classifiers stc
              where stc.term = parts.part_value
                and stc.weight = 3
            )
            or exists (
              select 1
              from public.search_term_classifiers stc
              where stc.term = parts.part_value
                and stc.weight = 3
                and not exists (
                  select 1
                  from goods_kinds kinds
                  where kinds.slug = stc.classifier_slug
                )
            )
          )
      ) as yes
  ),
  food_categories as (
    select category
    from (
      values

        ('bread-and-bakery'),
        ('eggs'),
        ('honey'),
        ('cheese-and-dairy'),
        ('maple'),
        ('apples-and-fruit'),
        ('vegetables'),
        ('meat-and-turkey'),
        ('pies-and-sweets'),
        ('prepared-foods'),
        ('preserves-and-sauces'),
        ('coffee-and-tea'),
        ('alcohol'),
        ('seafood'),
        ('flour-and-grains'),
        ('nuts-and-snacks'),
        ('beverages'),
        ('spices-and-seasonings'),
        ('oils-and-vinegars')
    ) as food(category)
  ),
  nonfood_categories as (
    select category
    from (
      values

        ('clothing-and-accessories'),
        ('home-and-kitchen'),
        ('art-and-stationery'),
        ('toys-and-kids'),
        ('health-and-wellness'),
        ('services'),
        ('garden-and-outdoor'),
        ('plants-and-flowers'),
        ('body-care'),
        ('candles-and-crafts'),
        ('jewellery-and-accessories'),
        ('other')
    ) as goods(category)
  ),
  cuisine_tags as (
    select tag
    from (
      values

        ('afghan'),
        ('argentinian'),
        ('belgian'),
        ('bolivian'),
        ('brazilian'),
        ('british'),
        ('cambodian'),
        ('caribbean'),
        ('chinese'),
        ('colombian'),
        ('dutch'),
        ('egyptian'),
        ('eritrean'),
        ('ethiopian'),
        ('filipino'),
        ('french'),
        ('german'),
        ('ghanaian'),
        ('greek'),
        ('guatemalan'),
        ('haitian'),
        ('hungarian'),
        ('indian'),
        ('italian'),
        ('jamaican'),
        ('japanese'),
        ('korean'),
        ('lebanese'),
        ('malaysian'),
        ('mediterranean'),
        ('mexican'),
        ('middle-eastern'),
        ('moroccan'),
        ('nepali'),
        ('nigerian'),
        ('pakistani'),
        ('persian'),
        ('peruvian'),
        ('polish'),
        ('portuguese'),
        ('salvadoran'),
        ('somali'),
        ('spanish'),
        ('sri-lankan'),
        ('syrian'),
        ('taiwanese'),
        ('thai'),
        ('tibetan'),
        ('trinidadian'),
        ('turkish'),
        ('ukrainian'),
        ('venezuelan'),
        ('vietnamese'),
        ('west-african')
    ) as cuisine(tag)
  ),
  cuisine_resolved as (
    select distinct tags.tag
    from cuisine_tags tags
    cross join clock
    where tags.tag = lower(clock.query)
      or replace(tags.tag, '-', ' ') = lower(clock.query)
      or lower(clock.query) = tags.tag || ' food'
      or lower(clock.query) = replace(tags.tag, '-', ' ') || ' food'
      or exists (
        select 1
        from query_parts parts
        where parts.part_kind in ('word', 'term')
          and (
            parts.part_value = tags.tag
            or parts.part_value = replace(tags.tag, '-', ' ')
            or parts.part_value = tags.tag || ' food'
            or parts.part_value = replace(tags.tag, '-', ' ') || ' food'
          )
      )
  ),
  phrases as (
    select clock.query as phrase
    from clock
    union
    select public.fold_search_text(s.canonical) as phrase
    from public.product_synonyms s
    cross join clock
    where public.fold_search_text(s.term) = clock.query
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
    where public.fold_search_text(s.term) = clock.query
      and s.category is not null
      and (
        public.fold_search_text(s.canonical) = public.fold_search_text(s.category)
        or public.fold_search_text(replace(s.category, '-', ' ')) = public.fold_search_text(s.canonical)
        or public.fold_search_text(s.category) = clock.query
        or public.fold_search_text(replace(s.category, '-', ' ')) = clock.query
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
          when position(lower(clock.query) in public.fold_search_text(vm.name)) > 0 then 1000
          else 0
        end
        + case
          when (select yes from has_terms)
            and position(lower(clock.query) in public.fold_search_text(vm.name)) > 0
            and (
              not (select yes from goods_term_query)
              or vm.product_category in (select nonfood_categories.category from nonfood_categories)
              or vm.product_category is null
              or exists (
                select 1
                from query_parts parts
                join public.search_term_classifiers stc
                  on stc.term = parts.part_value
                 and stc.weight = 3
                join public.vendor_menu_classifier_assignments a
                  on a.menu_id = vm.id
                 and a.classifier_slug = stc.classifier_slug
                where parts.part_kind = 'term'
              )
            )
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
        + ts_rank(to_tsvector('english', public.fold_search_text(vm.name)), plainto_tsquery('english', clock.query))
        + coalesce((
          select max(ts_rank(to_tsvector('english', public.fold_search_text(vm.name)), plainto_tsquery('english', phrases.phrase)))
          from phrases
          where lower(phrases.phrase) <> lower(clock.query)
        ), 0)
        + case
          when strpos(clock.query, ' ') = 0 and char_length(clock.query) >= 3
            then similarity(public.fold_search_text(vm.name), clock.query)
          else 0
        end
        + case
          when vm.product_category in (select cats.category from cats)
            and vm.product_slug not in (select slugs.slug from slugs)
          then 0.05
          else 0
        end
        + case
          when vm.product_category in (select food_categories.category from food_categories)
            and exists (
              select 1
              from public.vendor_menu_classifier_assignments a
              join cuisine_resolved cr
                on a.classifier_slug = 'origin.' || cr.tag
              where a.menu_id = vm.id
            )
          then 2000
          else 0
        end
        + case
          when vm.product_category in (select food_categories.category from food_categories)
            and exists (
              select 1
              from cuisine_resolved cr
              where cr.tag = any (coalesce(v.tags, '{}'::text[]))
            )
            and not exists (
              select 1
              from public.vendor_menu_classifier_assignments a
              join cuisine_resolved cr
                on a.classifier_slug = 'origin.' || cr.tag
              where a.menu_id = vm.id
            )
          then 0.25
          else 0
        end
        + case
          when exists (
            select 1
            from query_parts parts
            where parts.part_kind = 'term'
              and position(' ' in parts.part_value) > 0
          )
          and exists (
            select 1
            from query_parts parts
            join public.search_term_classifiers stc
              on stc.term = parts.part_value
             and stc.weight = 3
            join public.vendor_menu_classifier_assignments a
              on a.menu_id = vm.id
             and a.classifier_slug = stc.classifier_slug
            where parts.part_kind = 'term'
              and position(' ' in parts.part_value) > 0
          )
          then 500
          else 0
        end
        - case
          when vm.product_category is null then 0.01
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
              and position(public.fold_search_text(word_part.part_value) in public.fold_search_text(vm.name)) = 0
          )
        ) as classified,
        (
          vm.product_slug in (select slugs.slug from slugs)
          or vm.product_category in (select cats.category from cats)
          or to_tsvector('english', public.fold_search_text(vm.name)) @@ plainto_tsquery('english', clock.query)
          or exists (
            select 1
            from phrases
            where lower(phrases.phrase) <> lower(clock.query)
              and to_tsvector('english', public.fold_search_text(vm.name)) @@ plainto_tsquery('english', phrases.phrase)
          )
          or (
            strpos(clock.query, ' ') = 0
            and char_length(clock.query) >= 3
            and public.fold_search_text(vm.name) % clock.query
            and similarity(public.fold_search_text(vm.name), clock.query) >= 0.45
          )
        ) as existing,
        (
          vm.product_category in (select food_categories.category from food_categories)
          and exists (select 1 from cuisine_resolved)
          and (
            exists (
              select 1
              from public.vendor_menu_classifier_assignments a
              join cuisine_resolved cr
                on a.classifier_slug = 'origin.' || cr.tag
              where a.menu_id = vm.id
            )
            or exists (
              select 1
              from cuisine_resolved cr
              where cr.tag = any (coalesce(v.tags, '{}'::text[]))
            )
          )
          and (
            exists (
              select 1
              from cuisine_resolved cr
              where lower(clock.query) = cr.tag
                or lower(clock.query) = replace(cr.tag, '-', ' ')
                or lower(clock.query) = cr.tag || ' food'
                or lower(clock.query) = replace(cr.tag, '-', ' ') || ' food'
            )
            or not exists (
              select 1
              from query_parts word_part
              where word_part.part_kind = 'word'
                and position(public.fold_search_text(word_part.part_value) in public.fold_search_text(vm.name)) = 0
                and not exists (
                  select 1
                  from cuisine_resolved cr
                  where word_part.part_value = cr.tag
                    or word_part.part_value = replace(cr.tag, '-', ' ')
                    or (
                      word_part.part_value = 'food'
                      and (
                        lower(clock.query) = cr.tag || ' food'
                        or lower(clock.query) = replace(cr.tag, '-', ' ') || ' food'
                      )
                    )
                )
            )
          )
          and not exists (
            select 1
            from query_parts term_part
            where term_part.part_kind = 'term'
              and not exists (
                select 1
                from cuisine_resolved cr
                where term_part.part_value = cr.tag
                  or term_part.part_value = replace(cr.tag, '-', ' ')
                  or term_part.part_value = cr.tag || ' food'
                  or term_part.part_value = replace(cr.tag, '-', ' ') || ' food'
              )
              and not exists (
                select 1
                from public.search_term_classifiers stc
                join public.vendor_menu_classifier_assignments a
                  on a.classifier_slug = stc.classifier_slug
                 and a.menu_id = vm.id
                where stc.term = term_part.part_value
              )
          )
        ) as cuisine
    ) match
    where (
      (
        (
          (not (select yes from has_terms) and match.existing)
          or ((select yes from has_terms) and (match.classified or match.existing))
        )
        and (
          not (select yes from goods_term_query)
          or match.classified
          or vm.product_category in (select nonfood_categories.category from nonfood_categories)
          or (
            vm.product_category is null
            and match.existing
          )
        )
      )
      or match.cuisine
    )
      and (
        (
          vm.product_category = 'pet-food'
          and (select pet_query.allow from pet_query)
        )
        or (
          vm.product_category = 'alcohol'
          and (select alcohol_query.allow from alcohol_query)
        )
        or (
          vm.product_category is distinct from 'pet-food'
          and vm.product_category is distinct from 'alcohol'
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
            or (
              vm.product_category is null
              and match.existing
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

create index vendor_menus_name_fold_trgm_idx
  on public.vendor_menus
  using gin (public.fold_search_text(name) gin_trgm_ops);

create index vendor_menus_name_fold_fts_idx
  on public.vendor_menus
  using gin (to_tsvector('english', public.fold_search_text(name)));
