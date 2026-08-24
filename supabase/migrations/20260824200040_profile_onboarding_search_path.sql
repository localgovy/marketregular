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

revoke all on function public.favorite_slugs_ok(text[]) from public;
revoke all on function public.favorite_slugs_ok(text[]) from anon;
grant execute on function public.favorite_slugs_ok(text[]) to postgres, service_role, authenticated;
