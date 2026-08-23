alter table public.directory_census
  add column if not exists menus integer not null default 0;

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
        and lower(city) = 'toronto'
    ),
    (
      select count(distinct v.id)::integer
      from public.vendors v
      join public.market_vendors mv on mv.vendor_id = v.id
      join public.markets m on m.id = mv.market_id
      where v.status = 'published'
        and m.status = 'published'
        and lower(m.city) = 'toronto'
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
          and lower(m.city) = 'toronto'
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

drop trigger if exists directory_census_on_vendor_menus on public.vendor_menus;
create trigger directory_census_on_vendor_menus
after insert or update or delete or truncate on public.vendor_menus
for each statement
execute function private.touch_directory_census();

select private.refresh_directory_census();
