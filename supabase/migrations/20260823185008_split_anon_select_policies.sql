-- Anon has no SELECT on claimed_by. Child-table RLS that reads that column
-- fails the whole query (schedules, stall links, menus). Split published vs claimant.

drop policy if exists "schedules readable" on public.market_schedules;
drop policy if exists "published schedules readable" on public.market_schedules;
drop policy if exists "claimant or admin schedules readable" on public.market_schedules;

create policy "published schedules readable" on public.market_schedules
  for select using (
    exists (
      select 1 from public.markets m
      where m.id = market_id and m.status = 'published'
    )
  );

create policy "claimant or admin schedules readable" on public.market_schedules
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.markets m
      where m.id = market_id and m.claimed_by = auth.uid()
    )
  );

drop policy if exists "market vendors readable" on public.market_vendors;
drop policy if exists "published market vendors readable" on public.market_vendors;
drop policy if exists "claimant or admin market vendors readable" on public.market_vendors;

create policy "published market vendors readable" on public.market_vendors
  for select using (
    exists (
      select 1
      from public.markets m
      join public.vendors v on v.id = vendor_id
      where m.id = market_id
        and m.status = 'published'
        and v.status = 'published'
    )
  );

create policy "claimant or admin market vendors readable" on public.market_vendors
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.markets m
      where m.id = market_id and m.claimed_by = auth.uid()
    )
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.claimed_by = auth.uid()
    )
  );

drop policy if exists "menus readable" on public.vendor_menus;
drop policy if exists "published menus readable" on public.vendor_menus;
drop policy if exists "claimant or admin menus readable" on public.vendor_menus;

create policy "published menus readable" on public.vendor_menus
  for select using (
    exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.status = 'published'
    )
  );

create policy "claimant or admin menus readable" on public.vendor_menus
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.claimed_by = auth.uid()
    )
  );
