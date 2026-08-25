-- Let the signed-in person stamp their own onboarded_at after handle + three
-- halls are on the row. Service role can still stamp anyone. JWT still cannot
-- UPDATE the column directly (protect_profile_role).

create or replace function public.stamp_onboarded_at(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  stamped timestamptz;
begin
  if auth.role() is distinct from 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = p_user_id
    and username is not null
    and cardinality(favorite_market_slugs) = 3
  returning onboarded_at into stamped;
  return stamped;
end;
$$;

revoke all on function public.stamp_onboarded_at(uuid) from public, anon;
grant execute on function public.stamp_onboarded_at(uuid) to authenticated;
grant execute on function public.stamp_onboarded_at(uuid) to service_role;
