-- Listing for sale is paused. Paired with VENDOR_SALES_OPEN in src/lib/selling.ts.
-- Owners can still edit menu text. Existing sale columns stay stored.
-- New items are not for sale. can_buy stays false until both are restored.

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
  false as can_buy
from public.vendor_menus vm
join public.vendors v
  on v.id = vm.vendor_id
 and v.status = 'published';

revoke all on table public.published_menus from public, anon, authenticated;
grant select on table public.published_menus to service_role;

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
      false, false, false, false, null
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
    dietary = v_dietary
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
