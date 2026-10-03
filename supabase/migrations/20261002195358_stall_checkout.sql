-- Approved stalls can sell a menu item. Buyers pay the stall directly.
-- LOCALGOVY's 3.5% + $0.25 is a separate ledger, not a cut of the charge.
-- Stripe account ids stay off the data API. Orders and the fee ledger are
-- readable by the buyer or the stall owner; only the service role writes them.

alter table public.vendors
  add column selling_approved boolean not null default false;

create or replace function public.protect_vendor_privilege_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status
    or new.claimed_by is distinct from old.claimed_by
    or new.slug is distinct from old.slug
    or new.review_count is distinct from old.review_count
    or new.rating_avg is distinct from old.rating_avg
    or new.selling_approved is distinct from old.selling_approved
  then
    raise exception 'listing privilege columns cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_vendor_privilege_columns() from public, anon, authenticated;

alter table public.vendor_menus
  add column for_sale boolean not null default false,
  add column offer_delivery boolean not null default false,
  add column offer_pickup boolean not null default false,
  add column offer_preorder boolean not null default false,
  add column offer_terms text;

alter table public.vendor_menus
  add constraint vendor_menus_offer_terms_len
    check (offer_terms is null or char_length(offer_terms) <= 4000),
  add constraint vendor_menus_for_sale_ready
    check (
      not for_sale
      or (
        price_cents is not null
        and price_cents >= 50
        and price_cents <= 1000000
        and (offer_delivery or offer_pickup or offer_preorder)
      )
    );

create table public.vendor_stripe_accounts (
  vendor_id uuid primary key references public.vendors (id) on delete cascade,
  stripe_account_id text not null unique,
  card_payments_active boolean not null default false,
  payouts_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_stripe_accounts_id_shape check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$')
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles (id) on delete set null,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  menu_item_id uuid references public.vendor_menus (id) on delete set null,
  item_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 50 and unit_price_cents <= 1000000),
  quantity integer not null check (quantity between 1 and 20),
  charge_cents integer not null,
  fulfillment text not null check (fulfillment in ('delivery', 'pickup', 'preorder')),
  fulfillment_note text,
  delivery_name text,
  delivery_line1 text,
  delivery_city text,
  delivery_region text,
  delivery_postal text,
  terms_snapshot text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'refunded', 'partially_refunded', 'expired')
  ),
  refunded_cents integer not null default 0,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint orders_charge_matches check (charge_cents = unit_price_cents * quantity),
  constraint orders_refund_within_charge check (
    refunded_cents >= 0 and refunded_cents <= charge_cents
  ),
  constraint orders_note_len check (
    fulfillment_note is null or char_length(fulfillment_note) <= 500
  ),
  constraint orders_terms_len check (
    terms_snapshot is null or char_length(terms_snapshot) <= 4000
  )
);

create unique index orders_payment_intent_key
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index orders_buyer_idx on public.orders (buyer_id, paid_at desc);
create index orders_vendor_idx on public.orders (vendor_id, paid_at desc);

create table public.platform_fees (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  percent_cents integer not null check (percent_cents >= 0 and percent_cents <= 1000000),
  flat_cents integer not null check (flat_cents in (0, 25)),
  voided boolean not null default false,
  earned_on date not null,
  created_at timestamptz not null default now()
);

create index platform_fees_vendor_idx on public.platform_fees (vendor_id, earned_on);

create table public.platform_fee_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 50),
  stripe_checkout_session_id text not null unique,
  paid_at timestamptz not null default now()
);

create index platform_fee_payments_vendor_idx on public.platform_fee_payments (vendor_id, paid_at desc);

alter table public.vendor_stripe_accounts enable row level security;
alter table public.orders enable row level security;
alter table public.platform_fees enable row level security;
alter table public.platform_fee_payments enable row level security;

create policy orders_select on public.orders
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or (
      status in ('paid', 'partially_refunded', 'refunded')
      and public.owns_vendor(vendor_id)
    )
  );

create policy platform_fees_select on public.platform_fees
  for select to authenticated
  using (public.owns_vendor(vendor_id));

create policy platform_fee_payments_select on public.platform_fee_payments
  for select to authenticated
  using (public.owns_vendor(vendor_id));

revoke all on table public.vendor_stripe_accounts from public, anon, authenticated;
revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.platform_fees from public, anon, authenticated;
revoke all on table public.platform_fee_payments from public, anon, authenticated;

grant select on table public.orders to authenticated;
grant select on table public.platform_fees to authenticated;
grant select on table public.platform_fee_payments to authenticated;

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
    and coalesce(sa.card_payments_active, false)
    and vm.for_sale
    and coalesce(vm.price_cents, 0) >= 50
    and (vm.offer_delivery or vm.offer_pickup or vm.offer_preorder)
  ) as can_buy
from public.vendor_menus vm
join public.vendors v
  on v.id = vm.vendor_id
 and v.status = 'published'
left join public.vendor_stripe_accounts sa
  on sa.vendor_id = v.id;

revoke all on table public.published_menus from public, anon, authenticated;
grant select on table public.published_menus to service_role;

-- Owners can set how an item is handed over. selling_approved stays admin-only.
drop function if exists public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[]);

create function public.save_owned_menu_item(
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
  p_offer_terms text default null
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
  v_terms text;
  v_for_sale boolean;
  v_delivery boolean;
  v_pickup boolean;
  v_preorder boolean;
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
  v_for_sale := coalesce(p_for_sale, false);
  v_delivery := coalesce(p_offer_delivery, false);
  v_pickup := coalesce(p_offer_pickup, false);
  v_preorder := coalesce(p_offer_preorder, false);
  v_terms := nullif(btrim(coalesce(p_offer_terms, '')), '');
  if v_terms is not null and char_length(v_terms) > 4000 then
    raise exception 'Keep the terms shorter' using errcode = 'P0001';
  end if;

  if v_for_sale and (
    p_price_cents is null
    or p_price_cents < 50
    or not (v_delivery or v_pickup or v_preorder)
  ) then
    raise exception 'A sale needs a price and a handoff' using errcode = 'P0001';
  end if;

  if p_item_id is null then
    if (
      select count(*) from public.vendor_menus where vendor_id = p_vendor_id
    ) >= 80 then
      raise exception 'Menu is full' using errcode = 'P0001';
    end if;
    insert into public.vendor_menus (
      vendor_id, name, description, price_cents, season, dietary,
      for_sale, offer_delivery, offer_pickup, offer_preorder, offer_terms
    )
    values (
      p_vendor_id, v_name, v_description, p_price_cents, v_season, v_dietary,
      v_for_sale, v_delivery, v_pickup, v_preorder, v_terms
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
    offer_delivery = v_delivery,
    offer_pickup = v_pickup,
    offer_preorder = v_preorder,
    offer_terms = v_terms
  where id = p_item_id
    and vendor_id = p_vendor_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is missing' using errcode = 'P0001';
  end if;
  return v_id;
end;
$fn$;

revoke all on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text) to authenticated;

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
  if auth.uid() is null then
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
      'fee_balance_cents', (
        coalesce((
          select sum(case when f.voided then 0 else f.percent_cents + f.flat_cents end)
          from public.platform_fees f
          where f.vendor_id = v.id
        ), 0)
        -
        coalesce((
          select sum(p.amount_cents)
          from public.platform_fee_payments p
          where p.vendor_id = v.id
        ), 0)
      )::integer,
      'fee_due_on', (
        select to_char(make_date(extract(year from min(owed.earned_on))::int, 12, 31), 'YYYY-MM-DD')
        from (
          select
            f.earned_on,
            sum(f.percent_cents + f.flat_cents) over (
              order by f.earned_on, f.created_at, f.id
            ) as cum
          from public.platform_fees f
          where f.vendor_id = v.id
            and not f.voided
        ) owed
        where owed.cum > coalesce((
          select sum(p.amount_cents)
          from public.platform_fee_payments p
          where p.vendor_id = v.id
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
            'offer_terms', m.offer_terms
          )
          order by m.name, m.id
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
            'fulfillment', recent.fulfillment,
            'status', recent.status,
            'fulfillment_note', recent.fulfillment_note,
            'delivery_name', recent.delivery_name,
            'delivery_line1', recent.delivery_line1,
            'delivery_city', recent.delivery_city,
            'delivery_region', recent.delivery_region,
            'delivery_postal', recent.delivery_postal,
            'paid_at', recent.paid_at
          )
          order by recent.paid_at desc nulls last
        )
        from (
          select *
          from public.orders o
          where o.vendor_id = v.id
            and o.status in ('paid', 'partially_refunded', 'refunded')
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
                  'closes_at', to_char(ms.closes_at, 'HH24:MI')
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

create or replace function public.reject_postgis_data_api()
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  path text := lower(coalesce(current_setting('request.path', true), ''));
  rpc text;
begin
  if path = '' then
    return;
  end if;
  path := split_part(path, '?', 1);
  if auth.role() = 'service_role' then
    return;
  end if;
  if path ~ '/(spatial_ref_sys|geometry_columns|geography_columns)(/|$)'
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|directory_census|markets|vendors|vendor_stripe_accounts)(/|$)'
  then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  rpc := substring(path from '/rpc/([^/]+)');
  if rpc is null then
    return;
  end if;
  if auth.role() = 'authenticated'
    and rpc in (
      'is_admin',
      'my_profile',
      'stamp_onboarded_at',
      'owns_vendor',
      'has_owned_vendor',
      'awaiting_vendor_portal',
      'my_vendor_portal',
      'save_owned_vendor',
      'save_owned_menu_item',
      'delete_owned_menu_item',
      'save_owned_stall',
      'delete_owned_stall'
    )
  then
    return;
  end if;
  raise exception 'not allowed' using errcode = '42501';
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;
