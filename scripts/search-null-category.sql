-- Production checks for search_products name matches with a null product_category.
-- Run after 20261015210819_search_null_category_name.sql. Read-only except the
-- exception this block raises when a check fails.

do $$
declare
  taro int;
  koshi int;
  turkey_pet int;
  turkey_food int;
  beer_pet int;
  beer_rows int;
  dumpling_rows int;
  dumpling_pet int;
begin
  select count(*) into taro
  from public.search_products('Taro Milk Tea')
  where item_name = 'Taro Milk Tea'
    and product_category is null;

  select count(*) into koshi
  from public.search_products('Koshi Chime')
  where item_name = 'Aqua Koshi Chime'
    and product_category is null;

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

  select count(*) into dumpling_rows
  from public.search_products('dumplings');

  select count(*) into dumpling_pet
  from public.search_products('dumplings')
  where product_category = 'pet-food';

  if taro < 1 then
    raise exception 'Taro Milk Tea did not return the uncategorized item';
  end if;
  if koshi < 1 then
    raise exception 'Koshi Chime did not return the uncategorized item';
  end if;
  if turkey_pet <> 0 or turkey_food < 1 then
    raise exception 'turkey returned pet food or no other rows (pet %, other %)', turkey_pet, turkey_food;
  end if;
  if beer_pet <> 0 or beer_rows < 1 then
    raise exception 'beer returned pet food or no rows (pet %, rows %)', beer_pet, beer_rows;
  end if;
  if dumpling_pet <> 0 or dumpling_rows < 1 then
    raise exception 'dumplings returned pet food or no rows (pet %, rows %)', dumpling_pet, dumpling_rows;
  end if;
end $$;
