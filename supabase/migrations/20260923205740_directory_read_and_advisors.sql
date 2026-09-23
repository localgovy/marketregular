-- Distinct menu vendors in one response, atomic claim approval, nullable pins,
-- and the advisor fixes that do not change who can read or write.

create or replace function public.menu_vendor_ids()
returns uuid[]
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(array_agg(distinct vendor_id), '{}'::uuid[])
  from public.vendor_menus;
$$;

revoke all on function public.menu_vendor_ids() from public;
grant execute on function public.menu_vendor_ids() to anon, authenticated, service_role;

create or replace function public.decide_claim(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  claim public.claim_requests%rowtype;
  assigned uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Unknown claim status';
  end if;

  select * into claim from public.claim_requests where id = p_id;
  if not found then
    raise exception 'Claim not found';
  end if;

  if p_status = 'approved' then
    assigned := null;
    if claim.target_type = 'market' then
      update public.markets
        set claimed_by = claim.user_id
        where id = claim.target_id
          and (claimed_by is null or claimed_by = claim.user_id)
        returning id into assigned;
    elsif claim.target_type = 'vendor' then
      update public.vendors
        set claimed_by = claim.user_id
        where id = claim.target_id
          and (claimed_by is null or claimed_by = claim.user_id)
        returning id into assigned;
    else
      raise exception 'Unknown claim target';
    end if;
    if assigned is null then
      raise exception 'That listing is already claimed.';
    end if;

    update public.profiles
      set role = 'vendor'
      where id = claim.user_id
        and role is distinct from 'admin';
  end if;

  update public.claim_requests
    set status = p_status::public.claim_status,
        admin_note = p_note
    where id = p_id;
end;
$$;

revoke all on function public.decide_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_claim(uuid, text, text) to service_role;

alter table public.markets alter column lat drop not null;
alter table public.markets alter column lng drop not null;

create index if not exists vendors_status_name_idx on public.vendors (status, name);
create index if not exists markets_tags_gin on public.markets using gin (tags);
create index if not exists vendors_tags_gin on public.vendors using gin (tags);
create index if not exists markets_claimed_by_idx on public.markets (claimed_by);
create index if not exists vendors_claimed_by_idx on public.vendors (claimed_by);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles
  for update
  to public
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id and role = 'user'::public.user_role);

drop policy if exists "users insert claims" on public.claim_requests;
create policy "users insert claims"
  on public.claim_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'::public.claim_status
  );

drop policy if exists "users read own claims" on public.claim_requests;
create policy "users read own claims"
  on public.claim_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "auth insert posts" on public.posts;
create policy "auth insert posts"
  on public.posts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and verified_on_site = false);

drop policy if exists "own or admin posts readable" on public.posts;
create policy "own or admin posts readable"
  on public.posts
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "users delete own unflagged posts" on public.posts;
create policy "users delete own unflagged posts"
  on public.posts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and flagged = false);

drop policy if exists "own or admin reviews readable" on public.reviews;
create policy "own or admin reviews readable"
  on public.reviews
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "users select own saves" on public.saves;
create policy "users select own saves"
  on public.saves
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users insert own saves" on public.saves;
create policy "users insert own saves"
  on public.saves
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own saves" on public.saves;
create policy "users delete own saves"
  on public.saves
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- st_estimatedextent and spatial_ref_sys are owned by supabase_admin. The
-- postgres role cannot revoke or enable RLS on them; these blocks no-op and
-- the existing write-reject trigger on spatial_ref_sys stays in place.
do $$
begin
  execute 'revoke all on function public.st_estimatedextent(text, text) from public, anon, authenticated';
  execute 'revoke all on function public.st_estimatedextent(text, text, text) from public, anon, authenticated';
  execute 'revoke all on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated';
exception
  when insufficient_privilege then
    raise notice 'st_estimatedextent revoke skipped: %', sqlerrm;
end $$;

do $$
begin
  execute 'revoke all on table public.spatial_ref_sys from public, anon, authenticated';
  execute 'alter table public.spatial_ref_sys enable row level security';
  execute 'drop policy if exists spatial_ref_sys_no_client on public.spatial_ref_sys';
  execute $policy$
    create policy spatial_ref_sys_no_client
      on public.spatial_ref_sys
      for all
      to anon, authenticated
      using (false)
      with check (false)
  $policy$;
exception
  when insufficient_privilege then
    raise notice 'spatial_ref_sys lockdown skipped: %', sqlerrm;
end $$;
