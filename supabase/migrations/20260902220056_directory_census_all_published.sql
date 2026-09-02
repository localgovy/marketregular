-- Homepage census must match the live published directory.
-- A hardcoded city allowlist drifted from listings (Hamilton, Barrie, … stayed
-- published in markets but never entered the tally). Count status only.
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
