-- Vendor and market accounts request access. Assignment is the approval.
-- The person chooses their own password. This path never writes one.

create table public.portal_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.claim_target not null,
  organization_name text,
  requested_target_id uuid,
  assigned_target_id uuid,
  status public.claim_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portal_applications_request_shape check (
    (
      requested_target_id is not null
      and organization_name is null
    )
    or (
      requested_target_id is null
      and organization_name is not null
      and char_length(organization_name) between 1 and 120
    )
  )
);

create unique index portal_applications_one_pending_idx
  on public.portal_applications (user_id, kind)
  where status = 'pending';

create index portal_applications_user_created_idx
  on public.portal_applications (user_id, created_at desc);

create index portal_applications_pending_idx
  on public.portal_applications (created_at)
  where status = 'pending';

create trigger portal_applications_updated_at
  before update on public.portal_applications
  for each row execute function public.set_updated_at();

create or replace function public.guard_portal_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  new.user_id := auth.uid();
  new.status := 'pending';
  new.assigned_target_id := null;
  if tg_op = 'UPDATE' then
    new.kind := old.kind;
    new.created_at := old.created_at;
  end if;

  if new.requested_target_id is not null then
    new.organization_name := null;
    if new.kind = 'market' then
      if not exists (
        select 1 from public.markets
        where id = new.requested_target_id and status = 'published'
      ) then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
    elsif new.kind = 'vendor' then
      if not exists (
        select 1 from public.vendors
        where id = new.requested_target_id and status = 'published'
      ) then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
    else
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
  else
    new.organization_name := nullif(btrim(coalesce(new.organization_name, '')), '');
    if new.organization_name is null then
      raise exception 'Add the organization name' using errcode = 'P0001';
    end if;
    if char_length(new.organization_name) > 120 then
      raise exception 'Keep the organization name shorter' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if (
      select count(*) from public.portal_applications
      where user_id = new.user_id
        and created_at >= now() - interval '1 hour'
    ) >= 3 then
      raise exception 'Wait a bit before sending another request.' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.portal_applications
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Wait a bit before sending another request.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists guard_portal_application on public.portal_applications;
create trigger guard_portal_application
  before insert or update on public.portal_applications
  for each row
  execute function public.guard_portal_application();

revoke all on function public.guard_portal_application() from public, anon, authenticated;

create or replace function public.assign_portal_application(p_id uuid, p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  app public.portal_applications%rowtype;
  listing_claimed uuid;
  profile_role public.user_role;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into app
  from public.portal_applications
  where id = p_id
  for update;
  if not found then
    raise exception 'That request is missing' using errcode = 'P0001';
  end if;
  if app.status <> 'pending' then
    raise exception 'That request is already decided' using errcode = 'P0001';
  end if;

  if app.kind = 'vendor' then
    select claimed_by into listing_claimed
    from public.vendors
    where id = p_target_id
    for update;
    if not found then
      raise exception 'That stall is missing' using errcode = 'P0001';
    end if;
    if listing_claimed is not null and listing_claimed is distinct from app.user_id then
      raise exception 'Someone else already runs this stall' using errcode = 'P0001';
    end if;
    if listing_claimed is null then
      update public.vendors
      set claimed_by = app.user_id
      where id = p_target_id
        and claimed_by is null;
      if not found then
        raise exception 'Someone else already runs this stall' using errcode = 'P0001';
      end if;
    end if;
    select role into profile_role from public.profiles where id = app.user_id;
    if profile_role is distinct from 'admin' then
      update public.profiles set role = 'vendor' where id = app.user_id;
    end if;
  elsif app.kind = 'market' then
    select claimed_by into listing_claimed
    from public.markets
    where id = p_target_id
    for update;
    if not found then
      raise exception 'That market is missing' using errcode = 'P0001';
    end if;
    if listing_claimed is not null and listing_claimed is distinct from app.user_id then
      raise exception 'Someone else already runs this market' using errcode = 'P0001';
    end if;
    if listing_claimed is null then
      update public.markets
      set claimed_by = app.user_id
      where id = p_target_id
        and claimed_by is null;
      if not found then
        raise exception 'Someone else already runs this market' using errcode = 'P0001';
      end if;
    end if;
  else
    raise exception 'That request is missing' using errcode = 'P0001';
  end if;

  update public.portal_applications
  set status = 'approved',
      assigned_target_id = p_target_id
  where id = p_id;
end;
$fn$;

revoke all on function public.assign_portal_application(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_portal_application(uuid, uuid) to service_role;

create or replace function public.reject_portal_application(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  app public.portal_applications%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into app
  from public.portal_applications
  where id = p_id
  for update;
  if not found then
    raise exception 'That request is missing' using errcode = 'P0001';
  end if;
  if app.status <> 'pending' then
    raise exception 'That request is already decided' using errcode = 'P0001';
  end if;

  update public.portal_applications
  set status = 'rejected'
  where id = p_id
    and status = 'pending';
end;
$fn$;

revoke all on function public.reject_portal_application(uuid) from public, anon, authenticated;
grant execute on function public.reject_portal_application(uuid) to service_role;

create or replace function public.auth_emails_for_users(p_ids uuid[])
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = public
as $fn$
  select u.id, u.email::text
  from auth.users u
  where p_ids is not null
    and u.id = any (p_ids);
$fn$;

revoke all on function public.auth_emails_for_users(uuid[]) from public, anon, authenticated;
grant execute on function public.auth_emails_for_users(uuid[]) to service_role;

-- A pending account request skips shopper onboarding. An older pending claim still does too.
create or replace function public.awaiting_vendor_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.vendors where claimed_by = auth.uid()
      )
      or exists (
        select 1
        from public.portal_applications
        where user_id = auth.uid()
          and kind = 'vendor'
          and status = 'pending'
      )
      or exists (
        select 1
        from public.claim_requests
        where user_id = auth.uid()
          and target_type = 'vendor'
          and status = 'pending'
      )
    );
$fn$;

create or replace function public.awaiting_market_portal()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.markets where claimed_by = auth.uid()
      )
      or exists (
        select 1
        from public.portal_applications
        where user_id = auth.uid()
          and kind = 'market'
          and status = 'pending'
      )
      or exists (
        select 1
        from public.claim_requests
        where user_id = auth.uid()
          and target_type = 'market'
          and status = 'pending'
      )
    );
$fn$;

revoke all on function public.awaiting_vendor_portal() from public, anon;
grant execute on function public.awaiting_vendor_portal() to authenticated;

revoke all on function public.awaiting_market_portal() from public, anon;
grant execute on function public.awaiting_market_portal() to authenticated;

alter table public.portal_applications enable row level security;

revoke all on table public.portal_applications from public, anon, authenticated;
grant select (
  id,
  user_id,
  kind,
  organization_name,
  requested_target_id,
  assigned_target_id,
  status,
  created_at,
  updated_at
) on public.portal_applications to authenticated;
grant insert (
  user_id,
  kind,
  organization_name,
  requested_target_id
) on public.portal_applications to authenticated;
grant update (
  organization_name,
  requested_target_id
) on public.portal_applications to authenticated;
grant all on table public.portal_applications to service_role;

create policy "users read own portal applications"
  on public.portal_applications
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "users insert own portal applications"
  on public.portal_applications
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'::public.claim_status
    and assigned_target_id is null
  );

create policy "users update own pending portal applications"
  on public.portal_applications
  for update
  to authenticated
  using ((select auth.uid()) = user_id and status = 'pending'::public.claim_status)
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'::public.claim_status
    and assigned_target_id is null
  );
