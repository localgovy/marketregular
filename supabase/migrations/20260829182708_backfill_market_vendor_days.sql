-- Roster rows seeded without days never reach the vendors-today or week panels, which
-- filter on days. Official rosters are published per market, not per day, so a stall
-- is taken to attend every weekday its host market runs.
update public.market_vendors mv
set days = s.days
from (
  select market_id, array_agg(distinct weekday order by weekday)::smallint[] as days
  from public.market_schedules
  group by market_id
) s
where s.market_id = mv.market_id
  and cardinality(mv.days) = 0;
