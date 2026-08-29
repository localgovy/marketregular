-- Facebook was added after column-level SELECT grants, so anon cannot read it
-- until it is listed the same way as instagram and tiktok.
alter table public.markets add column if not exists facebook text;
alter table public.vendors add column if not exists facebook text;

grant select (facebook) on public.markets to anon, authenticated;
grant select (facebook) on public.vendors to anon, authenticated;
grant update (facebook) on public.markets to authenticated;
grant update (facebook) on public.vendors to authenticated;
