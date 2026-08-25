-- Visit-plan mail: one send per hour per account, and allow mail_sends kind=visit.

alter table public.mail_sends
  drop constraint if exists mail_sends_kind_check;

alter table public.mail_sends
  add constraint mail_sends_kind_check check (kind in ('claim', 'visit'));

create or replace function public.stamp_visit_plan_emailed_at(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
  set visit_plan_emailed_at = now()
  where id = p_user_id
    and (
      visit_plan_emailed_at is null
      or visit_plan_emailed_at < now() - interval '1 hour'
    );
  return found;
end;
$$;

revoke all on function public.stamp_visit_plan_emailed_at(uuid) from public, anon, authenticated;
grant execute on function public.stamp_visit_plan_emailed_at(uuid) to service_role;
