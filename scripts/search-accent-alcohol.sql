-- Production checks for accent-insensitive search_products and the alcohol gate.
-- Run after 20261016192256_search_accent_and_alcohol.sql. Read-only except the
-- exception this block raises when a check fails.

do $$
declare
  rose_from_plain int;
  rose_from_accent int;
  cab_plain_from_plain int;
  cab_plain_from_accent int;
  cab_accent_from_plain int;
  cab_accent_from_accent int;
  creme_from_plain int;
  creme_from_accent int;
  jala_accent_from_plain int;
  jala_plain_from_accent int;
  pumpkin_alcohol int;
  pumpkin_food int;
  muffin_alcohol int;
  muffin_food int;
  cider_alcohol int;
  gin_alcohol int;
  wine_alcohol int;
  turkey_pet int;
  turkey_food int;
  beer_pet int;
  beer_rows int;
  beer_alcohol int;
  dumpling_rows int;
  dumpling_pet int;
  taro int;
  rings_onion int;
  rings_jewel int;
begin
  select count(*) into rose_from_plain
  from public.search_products('rose')
  where item_name ~ 'Rosé'
    and product_category = 'alcohol';

  select count(*) into rose_from_accent
  from public.search_products('rosé')
  where item_name ~ 'Rosé'
    and product_category = 'alcohol';

  select count(*) into cab_plain_from_plain
  from public.search_products('cabernet rose')
  where item_name = 'Cabernet Rose';

  select count(*) into cab_plain_from_accent
  from public.search_products('cabernet rosé')
  where item_name = 'Cabernet Rose';

  select count(*) into cab_accent_from_plain
  from public.search_products('cabernet rose')
  where item_name ~ 'Rosé';

  select count(*) into cab_accent_from_accent
  from public.search_products('cabernet rosé')
  where item_name ~ 'Rosé';

  select count(*) into creme_from_plain
  from public.search_products('creme fraiche')
  where item_name = 'Crème Fraîche';

  select count(*) into creme_from_accent
  from public.search_products('crème fraîche')
  where item_name = 'Crème Fraîche';

  select count(*) into jala_accent_from_plain
  from public.search_products('candied jalapeno')
  where item_name = 'Candied Jalapeños';

  select count(*) into jala_plain_from_accent
  from public.search_products('candied jalapeño')
  where item_name = 'Candied Jalapenos';

  select count(*) into pumpkin_alcohol
  from public.search_products('pumpkin pie')
  where product_category = 'alcohol';

  select count(*) into pumpkin_food
  from public.search_products('pumpkin pie')
  where item_name ilike '%pumpkin pie%'
    and product_category is distinct from 'alcohol'
    and product_category is distinct from 'pet-food';

  select count(*) into muffin_alcohol
  from public.search_products('blueberry muffin')
  where product_category = 'alcohol';

  select count(*) into muffin_food
  from public.search_products('blueberry muffin')
  where item_name ilike '%blueberry muffin%'
    and product_category is distinct from 'alcohol';

  select count(*) into cider_alcohol
  from public.search_products('cider')
  where product_category = 'alcohol';

  select count(*) into gin_alcohol
  from public.search_products('gin')
  where product_category = 'alcohol';

  select count(*) into wine_alcohol
  from public.search_products('wine')
  where product_category = 'alcohol';

  select count(*) into turkey_pet
  from public.search_products('turkey')
  where product_category = 'pet-food';

  select count(*) into turkey_food
  from public.search_products('turkey')
  where product_category is distinct from 'pet-food';

  select count(*) into beer_pet
  from public.search_products('beer')
  where product_category = 'pet-food';

  select count(*) into beer_rows
  from public.search_products('beer');

  select count(*) into beer_alcohol
  from public.search_products('beer')
  where product_category = 'alcohol';

  select count(*) into dumpling_rows
  from public.search_products('dumplings');

  select count(*) into dumpling_pet
  from public.search_products('dumplings')
  where product_category = 'pet-food';

  select count(*) into taro
  from public.search_products('Taro Milk Tea')
  where item_name = 'Taro Milk Tea'
    and product_category is null;

  select count(*) into rings_onion
  from public.search_products('rings')
  where item_name ilike '%onion rings%';

  select count(*) into rings_jewel
  from public.search_products('rings')
  where product_category = 'jewellery-and-accessories';

  if rose_from_plain < 1 or rose_from_accent < 1 then
    raise exception 'rose/rosé did not return accented wine (plain %, accent %)', rose_from_plain, rose_from_accent;
  end if;
  if cab_plain_from_plain < 1 or cab_plain_from_accent < 1 or cab_accent_from_plain < 1 or cab_accent_from_accent < 1 then
    raise exception 'cabernet rose/rosé did not cross spellings (plain->plain %, accent->plain %, plain->accent %, accent->accent %)',
      cab_plain_from_plain, cab_plain_from_accent, cab_accent_from_plain, cab_accent_from_accent;
  end if;
  if creme_from_plain < 1 or creme_from_accent < 1 then
    raise exception 'creme fraiche did not find Crème Fraîche (plain %, accent %)', creme_from_plain, creme_from_accent;
  end if;
  if jala_accent_from_plain < 1 or jala_plain_from_accent < 1 then
    raise exception 'jalapeno spellings did not cross (accent from plain %, plain from accent %)',
      jala_accent_from_plain, jala_plain_from_accent;
  end if;
  if pumpkin_alcohol <> 0 or pumpkin_food < 1 then
    raise exception 'pumpkin pie returned alcohol or no food (alcohol %, food %)', pumpkin_alcohol, pumpkin_food;
  end if;
  if muffin_alcohol <> 0 or muffin_food < 1 then
    raise exception 'blueberry muffin returned alcohol or no food (alcohol %, food %)', muffin_alcohol, muffin_food;
  end if;
  if cider_alcohol < 1 or gin_alcohol < 1 or wine_alcohol < 1 then
    raise exception 'alcohol searches dropped alcohol rows (cider %, gin %, wine %)', cider_alcohol, gin_alcohol, wine_alcohol;
  end if;
  if turkey_pet <> 0 or turkey_food < 1 then
    raise exception 'turkey returned pet food or no other rows (pet %, other %)', turkey_pet, turkey_food;
  end if;
  if beer_pet <> 0 or beer_rows < 1 or beer_alcohol < 1 then
    raise exception 'beer returned pet food, no rows, or no alcohol (pet %, rows %, alcohol %)', beer_pet, beer_rows, beer_alcohol;
  end if;
  if dumpling_pet <> 0 or dumpling_rows < 1 then
    raise exception 'dumplings returned pet food or no rows (pet %, rows %)', dumpling_pet, dumpling_rows;
  end if;
  if taro < 1 then
    raise exception 'Taro Milk Tea did not return the uncategorized item';
  end if;
  if rings_onion <> 0 or rings_jewel < 1 then
    raise exception 'rings returned onion rings or no jewellery (onion %, jewel %)', rings_onion, rings_jewel;
  end if;
end $$;
