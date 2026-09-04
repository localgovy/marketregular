-- A hall clipped from a blog timetable: day, hours, score, vendors.

alter table public.saves drop constraint if exists saves_kind_check;

alter table public.saves
  add constraint saves_kind_check
  check (kind in ('market', 'vendor', 'blog', 'listing'));

alter table public.saves
  add column if not exists detail jsonb;

alter table public.saves
  drop constraint if exists saves_listing_detail_check;

alter table public.saves
  add constraint saves_listing_detail_check
  check (kind <> 'listing' or detail is not null);
