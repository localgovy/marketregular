-- Keep the city list in sync with LAUNCH_CITIES in src/lib/launch.ts
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
        and lower(btrim(city)) = any(array[
          'acton',
          'ajax',
          'aurora',
          'brampton',
          'brock',
          'burlington',
          'caledon',
          'clarington',
          'east gwillimbury',
          'east york',
          'etobicoke',
          'georgetown',
          'georgina',
          'halton hills',
          'king',
          'king city',
          'markham',
          'milton',
          'mississauga',
          'newcastle',
          'newmarket',
          'north york',
          'oakville',
          'oshawa',
          'pickering',
          'port perry',
          'richmond hill',
          'scarborough',
          'scugog',
          'stouffville',
          'toronto',
          'uxbridge',
          'vaughan',
          'whitby',
          'whitchurch-stouffville',
          'woodbridge'
        ]::text[])
    ),
    (
      select count(distinct v.id)::integer
      from public.vendors v
      join public.market_vendors mv on mv.vendor_id = v.id
      join public.markets m on m.id = mv.market_id
      where v.status = 'published'
        and m.status = 'published'
        and lower(btrim(m.city)) = any(array[
          'acton',
          'ajax',
          'aurora',
          'brampton',
          'brock',
          'burlington',
          'caledon',
          'clarington',
          'east gwillimbury',
          'east york',
          'etobicoke',
          'georgetown',
          'georgina',
          'halton hills',
          'king',
          'king city',
          'markham',
          'milton',
          'mississauga',
          'newcastle',
          'newmarket',
          'north york',
          'oakville',
          'oshawa',
          'pickering',
          'port perry',
          'richmond hill',
          'scarborough',
          'scugog',
          'stouffville',
          'toronto',
          'uxbridge',
          'vaughan',
          'whitby',
          'whitchurch-stouffville',
          'woodbridge'
        ]::text[])
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
          and lower(btrim(m.city)) = any(array[
            'acton',
            'ajax',
            'aurora',
            'brampton',
            'brock',
            'burlington',
            'caledon',
            'clarington',
            'east gwillimbury',
            'east york',
            'etobicoke',
            'georgetown',
            'georgina',
            'halton hills',
            'king',
            'king city',
            'markham',
            'milton',
            'mississauga',
            'newcastle',
            'newmarket',
            'north york',
            'oakville',
            'oshawa',
            'pickering',
            'port perry',
            'richmond hill',
            'scarborough',
            'scugog',
            'stouffville',
            'toronto',
            'uxbridge',
            'vaughan',
            'whitby',
            'whitchurch-stouffville',
            'woodbridge'
          ]::text[])
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
