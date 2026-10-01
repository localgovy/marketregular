-- Stall days were advertising weekdays the hall is not open.
-- Merchants' Flea Market is Saturday and Sunday; 28 shops listed Wednesday–Friday too.
-- Thames River Melons was marked Saturday at the Thursday Weston Village market.
-- Keep a shop's days when they are a subset of the hall. If none overlap, use the hall's days.

update public.market_vendors mv
set days = case
  when cardinality(kept.days) = 0 then sched.weekdays
  else kept.days
end
from (
  select
    mv2.market_id,
    mv2.vendor_id,
    coalesce((
      select array_agg(d order by d)
      from unnest(mv2.days) as d
      where d = any (
        select ms.weekday
        from public.market_schedules ms
        where ms.market_id = mv2.market_id
      )
    ), '{}'::smallint[]) as days
  from public.market_vendors mv2
) as kept,
(
  select market_id, array_agg(distinct weekday order by weekday) as weekdays
  from public.market_schedules
  group by market_id
) as sched
where mv.market_id = kept.market_id
  and mv.vendor_id = kept.vendor_id
  and mv.market_id = sched.market_id
  and exists (
    select 1
    from unnest(mv.days) as d
    where not (d = any (sched.weekdays))
  );

-- Those same shops said "Open Wednesday to Sunday" in the blurb.
-- The hall schedule is Saturday and Sunday, 10 AM–6 PM.
update public.vendors
set about = replace(about, 'Open Wednesday to Sunday.', 'Open Saturday and Sunday.')
where about like '%Open Wednesday to Sunday.%';
