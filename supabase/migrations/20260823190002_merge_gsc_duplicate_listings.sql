-- Fold GSC duplicate listings onto one canonical URL each.
-- Agrarian Kitchen: keep /vendors/agrarian-kitchen
-- SickKids: keep /markets/sickkids-market (outdoor + indoor winter hours)

do $$
declare
  keep_vendor uuid;
  drop_vendor uuid;
  keep_market uuid;
  drop_market uuid;
begin
  select id into keep_vendor from public.vendors where slug = 'agrarian-kitchen';
  select id into drop_vendor from public.vendors where slug = 'the-agrarian-kitchen-the-strong-earth-company';

  if keep_vendor is not null and drop_vendor is not null then
    update public.vendors as keep
    set
      name = 'Agrarian Kitchen & The Strong Earth Company',
      about = 'Agrarian Kitchen makes small-batch preserves, cakes, pickles, pies, and made-to-order sourdough pizza with a three-day fermented crust, using peak-season produce from local farmers and fellow market vendors. Its sister stall, The Strong Earth Company, grows seedlings, annuals, and perennials from urban Toronto gardens and sells houseplants and terrariums. At Evergreen Brick Works they are known for sticky toffee pudding, maple crème brûlée, and sticky buns made with maple from more than 20 years of tapping trees at a family cottage.',
      tags = (
        select coalesce(array_agg(distinct tag), '{}')
        from unnest(keep.tags || extra.tags) as tag
      ),
      website = coalesce(keep.website, extra.website),
      phone = coalesce(keep.phone, extra.phone),
      instagram = coalesce(keep.instagram, extra.instagram),
      tiktok = coalesce(keep.tiktok, extra.tiktok),
      updated_at = now()
    from public.vendors as extra
    where keep.id = keep_vendor and extra.id = drop_vendor;

    insert into public.market_vendors (market_id, vendor_id, stall, days)
    select market_id, keep_vendor, stall, days
    from public.market_vendors
    where vendor_id = drop_vendor
    on conflict (market_id, vendor_id) do update
      set
        stall = coalesce(excluded.stall, public.market_vendors.stall),
        days = case
          when cardinality(excluded.days) > 0 then excluded.days
          else public.market_vendors.days
        end;

    delete from public.market_vendors where vendor_id = drop_vendor;

    update public.vendor_menus set vendor_id = keep_vendor where vendor_id = drop_vendor;
    update public.reviews set vendor_id = keep_vendor where vendor_id = drop_vendor;
    update public.claim_requests
      set target_id = keep_vendor
      where target_type = 'vendor' and target_id = drop_vendor;

    delete from public.vendors where id = drop_vendor;
  end if;

  select id into keep_market from public.markets where slug = 'sickkids-market';
  select id into drop_market from public.markets where slug = 'sickkids-market-indoor-winter';

  if keep_market is not null then
    update public.markets
    set
      about = 'An Appletree market at SickKids Hospital for families, staff, and the neighbourhood. Outdoors Tuesdays 10 AM–2 PM, May through October, on the University Avenue driveway. Indoors every second Tuesday 11 AM–2 PM, January through April, in the atrium off the Elizabeth Street entrance.',
      tags = (
        select coalesce(array_agg(distinct tag), '{}')
        from unnest(tags || array['indoor']::text[]) as tag
      ),
      updated_at = now()
    where id = keep_market;

    insert into public.market_schedules (
      market_id, weekday, opens_at, closes_at, season_start, season_end, notes
    )
    select
      keep_market,
      2,
      '11:00'::time,
      '14:00'::time,
      '01-13',
      '04-21',
      'Indoor atrium off the Elizabeth Street entrance. Every second Tuesday.'
    where not exists (
      select 1
      from public.market_schedules
      where market_id = keep_market
        and weekday = 2
        and season_start = '01-13'
        and season_end = '04-21'
    );
  end if;

  if keep_market is not null and drop_market is not null then
    insert into public.market_vendors (market_id, vendor_id, stall, days)
    select keep_market, vendor_id, stall, days
    from public.market_vendors
    where market_id = drop_market
    on conflict (market_id, vendor_id) do nothing;

    update public.posts set market_id = keep_market where market_id = drop_market;
    update public.reviews set market_id = keep_market where market_id = drop_market;
    update public.claim_requests
      set target_id = keep_market
      where target_type = 'market' and target_id = drop_market;

    -- privilege trigger blocks status changes unless service_role; delete the duplicate instead.
    delete from public.markets where id = drop_market;
  end if;
end $$;
