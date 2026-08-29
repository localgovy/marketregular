-- Facebook pages for markets and vendors. Column-level SELECT is granted later
-- (grant_facebook_select) so this matches the live order of migrations.
alter table public.markets add column if not exists facebook text;
alter table public.vendors add column if not exists facebook text;
