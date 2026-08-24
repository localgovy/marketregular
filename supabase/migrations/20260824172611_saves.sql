-- Saved markets and stalls for signed-in regulars. Guests still use localStorage.

create table public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('market', 'vendor')),
  slug text not null check (
    char_length(slug) between 1 and 160
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, slug)
);

create index saves_user_created_idx on public.saves (user_id, created_at desc);

alter table public.saves enable row level security;

create policy "users select own saves"
  on public.saves
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users insert own saves"
  on public.saves
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users delete own saves"
  on public.saves
  for delete
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.saves from public, anon, authenticated;
grant select, insert, delete on table public.saves to authenticated;
