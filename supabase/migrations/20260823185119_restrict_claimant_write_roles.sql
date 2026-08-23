-- FOR ALL policies apply to SELECT. Anon evaluating claimed_by in those
-- expressions 42501s the whole schedules/menus query.

drop policy if exists "claimant write schedules" on public.market_schedules;
create policy "claimant write schedules" on public.market_schedules
  for all to authenticated
  using (
    exists (select 1 from public.markets m where m.id = market_id and m.claimed_by = auth.uid())
  )
  with check (
    exists (select 1 from public.markets m where m.id = market_id and m.claimed_by = auth.uid())
  );

drop policy if exists "claimant write menus" on public.vendor_menus;
create policy "claimant write menus" on public.vendor_menus
  for all to authenticated
  using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.claimed_by = auth.uid())
  )
  with check (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.claimed_by = auth.uid())
  );
