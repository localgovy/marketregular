-- Storefront menu groups live on vendor_menus, not product_category.
-- A stall can have at most 5 named sections. The row trigger trims names and
-- blocks a sixth section on a single-row write. It cannot see sibling rows in
-- the same statement, so an after-statement trigger counts the finished set.
-- A bulk UPDATE may fill NULL menu_section with up to five names. Rename and
-- reorder go through set_menu_sections, which skips both checks while it
-- rewrites names and then counts again.

alter table public.vendor_menus
  add column if not exists menu_section text null,
  add column if not exists menu_section_order smallint null;

alter table public.vendor_menus
  drop constraint if exists vendor_menus_menu_section_len,
  drop constraint if exists vendor_menus_menu_section_order_range;

alter table public.vendor_menus
  add constraint vendor_menus_menu_section_len
    check (menu_section is null or (char_length(btrim(menu_section)) between 1 and 40)),
  add constraint vendor_menus_menu_section_order_range
    check (menu_section_order is null or menu_section_order between 1 and 5);

comment on column public.vendor_menus.menu_section is
  'Storefront group for this stall. Independent of product_category.';
comment on column public.vendor_menus.menu_section_order is
  '1–5 display order for the stall''s named menu section.';

create or replace function public.vendor_menus_section_cap()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  n integer;
begin
  new.menu_section := nullif(btrim(coalesce(new.menu_section, '')), '');
  if new.menu_section is null then
    new.menu_section_order := null;
  elsif new.menu_section_order is not null
    and (new.menu_section_order < 1 or new.menu_section_order > 5) then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  if current_setting('marketregular.skip_menu_section_cap', true) = '1' then
    return new;
  end if;

  if new.menu_section is null then
    return new;
  end if;

  select count(*) into n
  from (
    select distinct menu_section
    from public.vendor_menus
    where vendor_id = new.vendor_id
      and id is distinct from new.id
      and menu_section is not null
    union
    select new.menu_section
  ) sections;

  if n > 5 then
    raise exception 'A menu can have at most 5 sections' using errcode = 'P0001';
  end if;

  return new;
end;
$fn$;

drop trigger if exists vendor_menus_section_cap on public.vendor_menus;
create trigger vendor_menus_section_cap
  before insert or update of menu_section, menu_section_order, vendor_id
  on public.vendor_menus
  for each row
  execute function public.vendor_menus_section_cap();

create or replace function public.vendor_menus_section_cap_stmt()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if current_setting('marketregular.skip_menu_section_cap', true) = '1' then
    return null;
  end if;

  if exists (
    select 1
    from public.vendor_menus
    where menu_section is not null
    group by vendor_id
    having count(distinct menu_section) > 5
  ) then
    raise exception 'A menu can have at most 5 sections' using errcode = 'P0001';
  end if;

  return null;
end;
$fn$;

drop trigger if exists vendor_menus_section_cap_stmt on public.vendor_menus;
create trigger vendor_menus_section_cap_stmt
  after insert or update of menu_section, menu_section_order, vendor_id
  on public.vendor_menus
  for each statement
  execute function public.vendor_menus_section_cap_stmt();

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
  false as can_buy,
  vm.menu_section,
  vm.menu_section_order
from public.vendor_menus vm
join public.vendors v
  on v.id = vm.vendor_id
 and v.status = 'published';

revoke all on table public.published_menus from public, anon, authenticated;
grant select on table public.published_menus to service_role;

drop function if exists public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text);
drop function if exists public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text, text, smallint);

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
  p_menu_section_order integer default null
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

  if p_item_id is null then
    if (
      select count(*) from public.vendor_menus where vendor_id = p_vendor_id
    ) >= 80 then
      raise exception 'Menu is full' using errcode = 'P0001';
    end if;
    insert into public.vendor_menus (
      vendor_id, name, description, price_cents, season, dietary,
      for_sale, offer_delivery, offer_pickup, offer_preorder, offer_terms,
      menu_section, menu_section_order
    )
    values (
      p_vendor_id, v_name, v_description, p_price_cents, v_season, v_dietary,
      false, false, false, false, null,
      v_section, v_order
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
    menu_section = v_section,
    menu_section_order = v_order
  where id = p_item_id
    and vendor_id = p_vendor_id
  returning id into v_id;

  if v_id is null then
    raise exception 'That item is missing' using errcode = 'P0001';
  end if;
  return v_id;
end;
$fn$;

revoke all on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text, text, integer) from public, anon;
grant execute on function public.save_owned_menu_item(uuid, uuid, text, text, integer, text, text[], boolean, boolean, boolean, boolean, text, text, integer) to authenticated;

create or replace function public.set_menu_sections(
  p_vendor_id uuid,
  p_sections jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n integer;
begin
  if not exists (select 1 from public.vendors where id = p_vendor_id) then
    raise exception 'That stall is missing' using errcode = 'P0001';
  end if;

  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  n := jsonb_array_length(p_sections);
  if n = 0 then
    return;
  end if;
  if n > 5 then
    raise exception 'A menu can have at most 5 sections' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sections) elem
    where nullif(btrim(coalesce(elem->>'name', '')), '') is null
       or char_length(btrim(elem->>'name')) > 40
       or nullif(btrim(coalesce(elem->>'from', elem->>'name', '')), '') is null
       or coalesce(elem->>'order', '') !~ '^[1-5]$'
  ) then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  if (
    select count(distinct btrim(elem->>'name'))
    from jsonb_array_elements(p_sections) elem
  ) <> n then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  if (
    select count(distinct btrim(coalesce(elem->>'from', elem->>'name')))
    from jsonb_array_elements(p_sections) elem
  ) <> n then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  if (
    select count(distinct (elem->>'order')::smallint)
    from jsonb_array_elements(p_sections) elem
  ) <> n then
    raise exception 'Those sections are not allowed' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sections) elem
    where not exists (
      select 1
      from public.vendor_menus m
      where m.vendor_id = p_vendor_id
        and m.menu_section = btrim(coalesce(elem->>'from', elem->>'name'))
    )
  ) then
    raise exception 'That section is missing' using errcode = 'P0001';
  end if;

  perform set_config('marketregular.skip_menu_section_cap', '1', true);

  update public.vendor_menus m
  set
    menu_section = p.new_name,
    menu_section_order = p.new_order
  from (
    select
      btrim(coalesce(elem->>'from', elem->>'name')) as from_name,
      btrim(elem->>'name') as new_name,
      (elem->>'order')::smallint as new_order
    from jsonb_array_elements(p_sections) elem
  ) p
  where m.vendor_id = p_vendor_id
    and m.menu_section = p.from_name;

  perform set_config('marketregular.skip_menu_section_cap', '0', true);

  if (
    select count(distinct menu_section)
    from public.vendor_menus
    where vendor_id = p_vendor_id
      and menu_section is not null
  ) > 5 then
    raise exception 'A menu can have at most 5 sections' using errcode = 'P0001';
  end if;
end;
$fn$;

revoke all on function public.set_menu_sections(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.set_menu_sections(uuid, jsonb) to service_role;

create or replace function public.set_owned_menu_sections(
  p_vendor_id uuid,
  p_sections jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.set_menu_sections(p_vendor_id, p_sections);
end;
$fn$;

revoke all on function public.set_owned_menu_sections(uuid, jsonb) from public, anon;
grant execute on function public.set_owned_menu_sections(uuid, jsonb) to authenticated;

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
            sum(f.percent_cents + f.flat_cents) over (
              order by f.earned_on, f.created_at, f.id
            ) as cum
          from public.platform_fees f
          join public.orders o on o.id = f.order_id
          where f.vendor_id = v.id
            and not f.voided
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
            'menu_section_order', m.menu_section_order
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
            and o.seller_user_id = auth.uid()
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
      'set_owned_menu_sections',
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
