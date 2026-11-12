alter table public.orders
  add column if not exists pickup_name text;

alter table public.orders
  add column if not exists market_name text;

alter table public.orders
  drop constraint if exists orders_pickup_name_len;

alter table public.orders
  add constraint orders_pickup_name_len
  check (pickup_name is null or char_length(pickup_name) between 1 and 80);

alter table public.orders
  drop constraint if exists orders_market_name_len;

alter table public.orders
  add constraint orders_market_name_len
  check (market_name is null or char_length(market_name) between 1 and 160);

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
            'pickup_name', recent.pickup_name,
            'market_name', recent.market_name,
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
