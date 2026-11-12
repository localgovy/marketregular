-- A charge stays on the account that took it, a dispute can pause handover,
-- and a stall can mark an item as alcohol so it reserves instead of charging a card.

alter table public.orders
  add column if not exists stripe_account_id text,
  add column if not exists disputed_at timestamptz;

alter table public.orders
  drop constraint if exists orders_stripe_account_id_shape;

alter table public.orders
  add constraint orders_stripe_account_id_shape
  check (stripe_account_id is null or stripe_account_id ~ '^acct_[A-Za-z0-9]+$');

alter table public.vendor_menus
  add column if not exists contains_alcohol boolean not null default false;

update public.vendor_menus
set offer_delivery = false
where offer_delivery;

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
      or vm.contains_alcohol
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

drop function if exists public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text, text, integer);

create or replace function public.save_owned_menu_item(
  p_vendor_id uuid,
  p_item_id uuid,
  p_name text,
  p_description text,
  p_price_cents integer,
  p_season text,
  p_dietary text[],
  p_for_sale boolean default false,
  p_offer_delivery boolean default false,
  p_offer_pickup boolean default false,
  p_offer_preorder boolean default false,
  p_offer_terms text default null,
  p_menu_section text default null,
  p_menu_section_order integer default null,
  p_contains_alcohol boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_description text;
  v_season text;
  v_dietary text[];
  v_section text;
  v_order smallint;
  v_terms text;
  v_for_sale boolean;
  v_pickup boolean;
  v_preorder boolean;
  v_alcohol boolean;
  v_id uuid;
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 160 then
    raise exception 'Add an item name' using errcode = 'P0001';
  end if;

  v_description := nullif(btrim(coalesce(p_description, '')), '');
  if v_description is not null and char_length(v_description) > 2000 then
    raise exception 'Keep the description shorter' using errcode = 'P0001';
  end if;

  if p_price_cents is not null and (p_price_cents < 0 or p_price_cents > 1000000) then
    raise exception 'That price is not allowed' using errcode = 'P0001';
  end if;

  v_season := nullif(btrim(coalesce(p_season, '')), '');
  if v_season is not null and char_length(v_season) > 120 then
    raise exception 'Keep the season shorter' using errcode = 'P0001';
  end if;

  v_dietary := public.portal_tags(p_dietary, 12);

  v_section := nullif(btrim(coalesce(p_menu_section, '')), '');
  if v_section is not null and char_length(v_section) > 40 then
    raise exception 'Keep the section name shorter' using errcode = 'P0001';
  end if;

  v_order := p_menu_section_order;
  if v_section is null then
    v_order := null;
  elsif v_order is not null and (v_order < 1 or v_order > 5) then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  v_terms := nullif(btrim(coalesce(p_offer_terms, '')), '');
  if v_terms is not null and char_length(v_terms) > 4000 then
    raise exception 'Keep the terms shorter' using errcode = 'P0001';
  end if;

  v_pickup := coalesce(p_offer_pickup, false);
  v_preorder := coalesce(p_offer_preorder, false);
  if coalesce(p_for_sale, false) and not (v_pickup or v_preorder) then
    raise exception 'Pick pickup or preorder' using errcode = 'P0001';
  end if;
  if coalesce(p_for_sale, false) and (p_price_cents is null or p_price_cents < 50) then
    raise exception 'A sale needs a price of at least $0.50' using errcode = 'P0001';
  end if;
  v_for_sale := coalesce(p_for_sale, false);
  v_alcohol := coalesce(p_contains_alcohol, false);

  if p_item_id is null then
    if (
      select count(*) from public.vendor_menus where vendor_id = p_vendor_id
    ) >= 80 then
      raise exception 'Menu is full' using errcode = 'P0001';
    end if;
    insert into public.vendor_menus (
      vendor_id, name, description, price_cents, season, dietary,
      for_sale, offer_delivery, offer_pickup, offer_preorder, offer_terms,
      menu_section, menu_section_order, contains_alcohol
    )
    values (
      p_vendor_id, v_name, v_description, p_price_cents, v_season, v_dietary,
      v_for_sale, false, v_pickup, v_preorder, v_terms,
      v_section, v_order, v_alcohol
    )
    returning id into v_id;
    return v_id;
  end if;

  update public.vendor_menus
  set
    name = v_name,
    description = v_description,
    price_cents = p_price_cents,
    season = v_season,
    dietary = v_dietary,
    for_sale = v_for_sale,
    offer_delivery = false,
    offer_pickup = v_pickup,
    offer_preorder = v_preorder,
    offer_terms = v_terms,
    menu_section = v_section,
    menu_section_order = v_order,
    contains_alcohol = v_alcohol
  where id = p_item_id
    and vendor_id = p_vendor_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is missing' using errcode = 'P0001';
  end if;
  return v_id;
end;
$fn$;

revoke all on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text, text, integer, boolean) from public, anon;
grant execute on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text, text, integer, boolean) to authenticated;

create or replace function public.my_vendor_portal()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  result jsonb;
begin
  if auth.uid() is null or public.password_change_pending() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(owned.vendor_row order by owned.vendor_row->>'name'),
    '[]'::jsonb
  )
  into result
  from (
    select jsonb_build_object(
      'id', v.id,
      'slug', v.slug,
      'name', v.name,
      'about', v.about,
      'website', v.website,
      'instagram', v.instagram,
      'tiktok', v.tiktok,
      'facebook', v.facebook,
      'phone', v.phone,
      'email', v.email,
      'logo_url', v.logo_url,
      'tags', coalesce(v.tags, '{}'::text[]),
      'maintenance_opt_outs', coalesce(v.maintenance_opt_outs, '{}'::text[]),
      'status', v.status,
      'selling_approved', v.selling_approved,
      'card_payments_active', coalesce((
        select s.card_payments_active
        from public.vendor_stripe_accounts s
        where s.vendor_id = v.id
      ), false),
      'payouts_active', coalesce((
        select s.payouts_active
        from public.vendor_stripe_accounts s
        where s.vendor_id = v.id
      ), false),
      'payments_started', exists (
        select 1 from public.vendor_stripe_accounts s where s.vendor_id = v.id
      ),
      'commission_bps', coalesce((
        select case
          when o.intro_until is null or o.intro_until > now() then o.intro_bps
          else o.standard_bps
        end
        from public.vendor_fee_overrides o
        where o.vendor_id = v.id
      ), 400),
      'commission_flat_cents', coalesce((
        select o.flat_cents
        from public.vendor_fee_overrides o
        where o.vendor_id = v.id
      ), 0),
      'fee_balance_cents', (
        coalesce((
          select sum(case when f.voided or f.collected_on_charge then 0 else f.percent_cents + f.flat_cents + f.service_fee_cents end)
          from public.platform_fees f
          join public.orders o on o.id = f.order_id
          where f.vendor_id = v.id
            and o.seller_user_id = auth.uid()
        ), 0)
        -
        coalesce((
          select sum(p.amount_cents)
          from public.platform_fee_payments p
          where p.vendor_id = v.id
            and p.seller_user_id = auth.uid()
        ), 0)
      )::integer,
      'fee_due_on', (
        select to_char(make_date(extract(year from min(owed.earned_on))::int, 12, 31), 'YYYY-MM-DD')
        from (
          select
            f.earned_on,
            sum(f.percent_cents + f.flat_cents + f.service_fee_cents) over (
              order by f.earned_on, f.created_at, f.id
            ) as cum
          from public.platform_fees f
          join public.orders o on o.id = f.order_id
          where f.vendor_id = v.id
            and not f.voided
            and not f.collected_on_charge
            and o.seller_user_id = auth.uid()
        ) owed
        where owed.cum > coalesce((
          select sum(p.amount_cents)
          from public.platform_fee_payments p
          where p.vendor_id = v.id
            and p.seller_user_id = auth.uid()
        ), 0)
      ),
      'menus', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'name', m.name,
            'description', m.description,
            'price_cents', m.price_cents,
            'season', m.season,
            'dietary', coalesce(m.dietary, '{}'::text[]),
            'for_sale', m.for_sale,
            'offer_delivery', m.offer_delivery,
            'offer_pickup', m.offer_pickup,
            'offer_preorder', m.offer_preorder,
            'offer_terms', m.offer_terms,
            'menu_section', m.menu_section,
            'menu_section_order', m.menu_section_order,
            'contains_alcohol', m.contains_alcohol or m.product_category = 'alcohol',
            'product_category', m.product_category
          )
          order by m.menu_section_order nulls last, m.menu_section nulls last, m.name, m.id
        )
        from public.vendor_menus m
        where m.vendor_id = v.id
      ), '[]'::jsonb),
      'orders', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', recent.id,
            'item_name', recent.item_name,
            'quantity', recent.quantity,
            'charge_cents', recent.charge_cents,
            'service_fee_cents', recent.service_fee_cents,
            'fulfillment', recent.fulfillment,
            'status', recent.status,
            'fulfillment_note', recent.fulfillment_note,
            'delivery_name', recent.delivery_name,
            'delivery_line1', recent.delivery_line1,
            'delivery_city', recent.delivery_city,
            'delivery_region', recent.delivery_region,
            'delivery_postal', recent.delivery_postal,
            'buyer_email', recent.buyer_email,
            'paid_at', recent.paid_at,
            'ready_at', recent.ready_at,
            'pickup_starts_at', recent.pickup_starts_at,
            'disputed_at', recent.disputed_at
          )
          order by recent.paid_at desc nulls last
        )
        from (
          select *
          from public.orders o
          where o.vendor_id = v.id
            and o.seller_user_id = auth.uid()
            and o.status in ('paid', 'partially_refunded', 'refunded', 'reserved', 'cancelled')
          order by o.paid_at desc nulls last
          limit 40
        ) recent
      ), '[]'::jsonb),
      'stalls', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'market_id', mv.market_id,
            'market_name', mk.name,
            'market_slug', mk.slug,
            'market_city', mk.city,
            'stall', mv.stall,
            'days', coalesce(mv.days, '{}'::smallint[]),
            'open_days', coalesce((
              select array_agg(distinct ms.weekday order by ms.weekday)
              from public.market_schedules ms
              where ms.market_id = mk.id
            ), '{}'::smallint[]),
            'hours', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'weekday', ms.weekday,
                  'opens_at', to_char(ms.opens_at, 'HH24:MI'),
                  'closes_at', to_char(ms.closes_at, 'HH24:MI'),
                  'season_start', ms.season_start,
                  'season_end', ms.season_end,
                  'notes', ms.notes
                )
                order by ms.weekday, ms.opens_at
              )
              from public.market_schedules ms
              where ms.market_id = mk.id
            ), '[]'::jsonb)
          )
          order by mk.name
        )
        from public.market_vendors mv
        join public.markets mk on mk.id = mv.market_id
        where mv.vendor_id = v.id
      ), '[]'::jsonb)
    ) as vendor_row
    from public.vendors v
    where v.claimed_by = auth.uid()
  ) owned;

  return result;
end;
$fn$;

notify pgrst, 'reload schema';
