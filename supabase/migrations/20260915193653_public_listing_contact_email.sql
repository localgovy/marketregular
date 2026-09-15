-- Listing contact emails are public directory fields, same as phone.
-- claimed_by stays private. New columns stay unreadable until named here.
alter table public.vendors add column if not exists email text;

grant select (email) on public.markets to anon, authenticated;
grant select (email) on public.vendors to anon, authenticated;
grant update (email) on public.vendors to authenticated;
