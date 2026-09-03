-- Saved notes from /blog, same list as markets and stalls.

alter table public.saves drop constraint if exists saves_kind_check;

alter table public.saves
  add constraint saves_kind_check
  check (kind in ('market', 'vendor', 'blog'));
