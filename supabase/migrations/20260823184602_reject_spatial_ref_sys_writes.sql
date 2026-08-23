-- spatial_ref_sys is owned by supabase_admin, so postgres cannot REVOKE or enable RLS.
-- postgres does have TRIGGER, so block Data API writes that would pollute PostGIS.

create or replace function public.reject_spatial_ref_sys_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'spatial_ref_sys is read-only' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.reject_spatial_ref_sys_writes() from public, anon, authenticated;

drop trigger if exists reject_spatial_ref_sys_writes on public.spatial_ref_sys;
create trigger reject_spatial_ref_sys_writes
  before insert or update or delete on public.spatial_ref_sys
  for each row
  execute function public.reject_spatial_ref_sys_writes();
