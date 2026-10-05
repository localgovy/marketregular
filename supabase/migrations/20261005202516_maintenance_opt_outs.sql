-- Owners choose which storefront sections directory upkeep leaves alone.

alter table public.vendors
  add column if not exists maintenance_opt_outs text[] not null default '{}';

alter table public.markets
  add column if not exists maintenance_opt_outs text[] not null default '{}';

comment on column public.vendors.maintenance_opt_outs is
  'Sections the stall keeps itself. Directory upkeep leaves these alone.';

comment on column public.markets.maintenance_opt_outs is
  'Sections the market keeps itself. Directory upkeep leaves these alone.';

create or replace function public.maintenance_opt_outs_ok(p_kind text, p_sections text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    p_sections is not null
    and (
      select count(*) = count(distinct section)
      from unnest(p_sections) as section
    )
    and p_sections <@ case p_kind
      when 'vendor' then array['about', 'logo', 'contact', 'links', 'tags', 'menu', 'halls']::text[]
      when 'market' then array['about', 'logo', 'contact', 'links', 'tags', 'place', 'hours', 'roster']::text[]
      else null::text[]
    end,
    false
  );
$$;

revoke all on function public.maintenance_opt_outs_ok(text, text[]) from public, anon, authenticated;
grant execute on function public.maintenance_opt_outs_ok(text, text[]) to service_role;

alter table public.vendors
  drop constraint if exists vendors_maintenance_opt_outs_ok;

alter table public.vendors
  add constraint vendors_maintenance_opt_outs_ok
  check (public.maintenance_opt_outs_ok('vendor', maintenance_opt_outs));

alter table public.markets
  drop constraint if exists markets_maintenance_opt_outs_ok;

alter table public.markets
  add constraint markets_maintenance_opt_outs_ok
  check (public.maintenance_opt_outs_ok('market', maintenance_opt_outs));

create or replace function public.save_owned_maintenance_opt_outs(
  p_kind text,
  p_id uuid,
  p_sections text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or public.password_change_pending() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind is distinct from 'vendor' and p_kind is distinct from 'market' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind = 'vendor' then
    if not public.owns_vendor(p_id) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  elsif not public.owns_market(p_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_sections is null or not public.maintenance_opt_outs_ok(p_kind, p_sections) then
    raise exception 'That section is not allowed' using errcode = 'P0001';
  end if;

  if p_kind = 'vendor' then
    update public.vendors
    set maintenance_opt_outs = p_sections
    where id = p_id
      and claimed_by = auth.uid();
  else
    update public.markets
    set maintenance_opt_outs = p_sections
    where id = p_id
      and claimed_by = auth.uid();
  end if;

  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$fn$;

revoke all on function public.save_owned_maintenance_opt_outs(text, uuid, text[]) from public, anon;
grant execute on function public.save_owned_maintenance_opt_outs(text, uuid, text[]) to authenticated;

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

create or replace function public.my_market_portal()
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
    jsonb_agg(owned.market_row order by owned.market_row->>'name'),
    '[]'::jsonb
  )
  into result
  from (
    select jsonb_build_object(
      'id', m.id,
      'slug', m.slug,
      'name', m.name,
      'about', m.about,
      'address', m.address,
      'city', m.city,
      'province', m.province,
      'postal_code', m.postal_code,
      'website', m.website,
      'instagram', m.instagram,
      'tiktok', m.tiktok,
      'facebook', m.facebook,
      'phone', m.phone,
      'email', m.email,
      'logo_url', m.logo_url,
      'tags', coalesce(m.tags, '{}'::text[]),
      'maintenance_opt_outs', coalesce(m.maintenance_opt_outs, '{}'::text[]),
      'status', m.status,
      'created_count', (
        select count(*)::integer
        from public.vendors created
        where created.created_by_market_id = m.id
      ),
      'schedules', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', ms.id,
            'weekday', ms.weekday,
            'opens_at', to_char(ms.opens_at, 'HH24:MI'),
            'closes_at', to_char(ms.closes_at, 'HH24:MI'),
            'season_start', ms.season_start,
            'season_end', ms.season_end,
            'notes', ms.notes
          )
          order by ms.weekday, ms.opens_at, ms.id
        )
        from public.market_schedules ms
        where ms.market_id = m.id
      ), '[]'::jsonb),
      'stalls', coalesce((
        select jsonb_agg(stall.stall_row order by stall.stall_row->>'vendor_name')
        from (
          select
            jsonb_build_object(
              'vendor_id', v.id,
              'vendor_name', v.name,
              'vendor_slug', v.slug,
              'stall', mv.stall,
              'days', coalesce(mv.days, '{}'::smallint[]),
              'claimed', v.claimed_by is not null,
              'created_here', v.created_by_market_id = m.id,
              'editable', v.created_by_market_id = m.id and v.claimed_by is null
            )
            || case
              when v.created_by_market_id = m.id and v.claimed_by is null then
                jsonb_build_object(
                  'about', v.about,
                  'website', v.website,
                  'instagram', v.instagram,
                  'tiktok', v.tiktok,
                  'facebook', v.facebook,
                  'phone', v.phone,
                  'email', v.email,
                  'logo_url', v.logo_url,
                  'tags', coalesce(v.tags, '{}'::text[])
                )
              else '{}'::jsonb
            end as stall_row
          from public.market_vendors mv
          join public.vendors v on v.id = mv.vendor_id
          where mv.market_id = m.id
        ) stall
      ), '[]'::jsonb)
    ) as market_row
    from public.markets m
    where m.claimed_by = auth.uid()
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
      'save_owned_maintenance_opt_outs',
      'save_owned_menu_item',
      'delete_owned_menu_item',
      'save_owned_stall',
      'delete_owned_stall',
      'owns_market',
      'has_owned_market',
      'awaiting_market_portal',
      'my_market_portal',
      'save_owned_market',
      'save_owned_schedule',
      'delete_owned_schedule',
      'save_market_roster',
      'delete_market_roster',
      'create_market_vendor',
      'save_market_vendor_profile'
    )
  then
    return;
  end if;
  raise exception 'not allowed' using errcode = '42501';
end;
$$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;
