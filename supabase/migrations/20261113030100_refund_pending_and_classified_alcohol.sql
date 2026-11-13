-- A refund that Stripe has accepted but not finished is its own order state.
-- A stall checkbox does not turn a card sale into an unpaid reservation.

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
    check (status in (
      'pending', 'paid', 'refunded', 'partially_refunded', 'refund_pending', 'expired', 'reserved', 'cancelled'
    ));

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or (
      seller_user_id = (select auth.uid())
      and status in ('paid', 'partially_refunded', 'refunded', 'refund_pending', 'reserved', 'cancelled')
      and public.owns_vendor(vendor_id)
    )
  );

do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.my_vendor_portal()'::regprocedure) into definition;
  definition := replace(
    definition,
    'and o.status in (''paid'', ''partially_refunded'', ''refunded'', ''reserved'', ''cancelled'')',
    'and o.status in (''paid'', ''partially_refunded'', ''refunded'', ''refund_pending'', ''reserved'', ''cancelled'')'
  );
  execute definition;
end $$;

create or replace view public.published_menus
with (security_invoker = true) as
select
  vm.id,
  vm.vendor_id,
  vm.name,
  vm.description,
  vm.price_cents,
  vm.season,
  vm.dietary,
  vm.product_category,
  vm.product_slug,
  vm.for_sale,
  vm.offer_delivery,
  vm.offer_pickup,
  vm.offer_preorder,
  vm.offer_terms,
  (
    v.selling_approved
    and vm.for_sale
    and coalesce(vm.price_cents, 0) >= 50
    and (vm.offer_pickup or vm.offer_preorder)
    and (
      vm.product_category = 'alcohol'
      or coalesce(sa.card_payments_active, false)
    )
  ) as can_buy,
  vm.menu_section,
  vm.menu_section_order,
  mip.image_url,
  vm.contains_alcohol
from public.vendor_menus vm
join public.vendors v
  on v.id = vm.vendor_id
 and v.status = 'published'
left join public.vendor_stripe_accounts sa
  on sa.vendor_id = v.id
left join public.menu_item_photos mip
  on mip.menu_id = vm.id;

alter view public.published_menus set (security_invoker = true);

revoke all on table public.published_menus from public, anon, authenticated;
grant select on table public.published_menus to service_role;
