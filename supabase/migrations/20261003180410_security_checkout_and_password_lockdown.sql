-- Checkout events from a connected account must not expire, pay, or refund
-- an order they do not already own. Fee credit is only for a platform session
-- this app opened. Order rows leave the Data API. A one-time stall password
-- cannot call the stall RPCs, and a chosen password is not stored.

create table public.platform_fee_sessions (
  stripe_checkout_session_id text primary key,
  vendor_id uuid not null references public.vendors (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 50 and amount_cents <= 100000000),
  created_at timestamptz not null default now()
);

alter table public.platform_fee_sessions enable row level security;

revoke all on table public.platform_fee_sessions from public, anon, authenticated;
grant all on table public.platform_fee_sessions to service_role;

drop policy if exists orders_select on public.orders;
drop policy if exists platform_fees_select on public.platform_fees;
drop policy if exists platform_fee_payments_select on public.platform_fee_payments;

revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.platform_fees from public, anon, authenticated;
revoke all on table public.platform_fee_payments from public, anon, authenticated;

-- Table REVOKE does not clear column privileges, so an embed from posts or
-- reviews could still read directory columns. Name every leftover grant.
do $$
declare
  r record;
begin
  for r in
    select table_name, column_name, grantee, privilege_type
    from information_schema.column_privileges
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'PUBLIC', 'public')
      and table_name in (
        'markets',
        'vendors',
        'vendor_menus',
        'market_schedules',
        'market_vendors',
        'directory_census',
        'orders',
        'platform_fees',
        'platform_fee_payments',
        'platform_fee_sessions',
        'vendor_stripe_accounts',
        'vendor_sign_in_secrets',
        'product_synonyms'
      )
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
  loop
    execute format(
      'revoke %s (%I) on table public.%I from %s',
      r.privilege_type,
      r.column_name,
      r.table_name,
      case when lower(r.grantee) = 'public' then 'public' else quote_ident(r.grantee) end
    );
  end loop;
end $$;

update public.vendor_sign_in_secrets
set ciphertext = 'chosen.v1.password-not-stored'
where chosen = true
  and ciphertext is distinct from 'chosen.v1.password-not-stored';

create or replace function public.password_change_pending()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'must_set_password', '') = 'true';
$$;

revoke all on function public.password_change_pending() from public, anon, authenticated;

create or replace function public.owns_vendor(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.password_change_pending()
    and exists (
      select 1
      from public.vendors
      where id = p_id
        and claimed_by = auth.uid()
    );
$$;

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
            'buyer_email', recent.buyer_email,
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
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|directory_census|markets|vendors|vendor_stripe_accounts|vendor_sign_in_secrets|orders|platform_fees|platform_fee_payments|platform_fee_sessions)(/|$)'
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
