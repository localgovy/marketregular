-- Unique public handle, favorite halls, and onboarding completion.
-- handle_new_user does not invent a username.

alter table public.profiles
  add column if not exists username text,
  add column if not exists favorite_market_slugs text[] not null default '{}'::text[],
  add column if not exists onboarded_at timestamptz,
  add column if not exists visit_plan_emailed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

alter table public.profiles
  drop constraint if exists profiles_favorite_market_slugs_len;
alter table public.profiles
  add constraint profiles_favorite_market_slugs_len
  check (cardinality(favorite_market_slugs) <= 3);

create or replace function public.favorite_slugs_ok(slugs text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    (
      select bool_and(
        s ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        and char_length(s) between 1 and 160
      )
      from unnest(slugs) as s
    ),
    true
  );
$$;

alter table public.profiles
  drop constraint if exists profiles_favorite_market_slugs_kebab;
alter table public.profiles
  add constraint profiles_favorite_market_slugs_kebab
  check (public.favorite_slugs_ok(favorite_market_slugs));

create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;

revoke all on function public.favorite_slugs_ok(text[]) from public;
revoke all on function public.favorite_slugs_ok(text[]) from anon;
grant execute on function public.favorite_slugs_ok(text[]) to postgres, service_role, authenticated;
