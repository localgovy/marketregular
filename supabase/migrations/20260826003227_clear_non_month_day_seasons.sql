-- Treat "year-round" (and any other non MM-DD value) as no season window.
update public.market_schedules
set
  season_start = case
    when season_start ~ '^\d{2}-\d{2}$' then season_start
    else null
  end,
  season_end = case
    when season_end ~ '^\d{2}-\d{2}$' then season_end
    else null
  end
where
  (season_start is not null and season_start !~ '^\d{2}-\d{2}$')
  or (season_end is not null and season_end !~ '^\d{2}-\d{2}$');
