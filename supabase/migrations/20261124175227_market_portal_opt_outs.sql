-- Market editors can keep a section themselves. The save was defined with the
-- column, then a later data-api allowlist replaced the portal function list
-- and left the save out. Signed-in calls were rejected before they ran.
-- A market approval still does not set profiles.role. That flag is for a stall.

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

update public.markets
set maintenance_opt_outs = coalesce((
  select array_agg(distinct section)
  from unnest(maintenance_opt_outs) as section
  where section = any (array['about', 'logo', 'contact', 'links', 'tags', 'place', 'hours', 'roster']::text[])
), '{}'::text[])
where not public.maintenance_opt_outs_ok('market', maintenance_opt_outs);

update public.vendors
set maintenance_opt_outs = coalesce((
  select array_agg(distinct section)
  from unnest(maintenance_opt_outs) as section
  where section = any (array['about', 'logo', 'contact', 'links', 'tags', 'menu', 'halls']::text[])
), '{}'::text[])
where not public.maintenance_opt_outs_ok('vendor', maintenance_opt_outs);

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

revoke all on function public.my_market_portal() from public, anon;
grant execute on function public.my_market_portal() to authenticated;

create or replace function public.decide_claim(p_id uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  claim public.claim_requests%rowtype;
  assigned uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Unknown claim status';
  end if;

  select * into claim from public.claim_requests where id = p_id for update;
  if not found then
    raise exception 'Claim not found';
  end if;
  if claim.status is distinct from 'pending'::public.claim_status then
    raise exception 'That claim is already decided' using errcode = 'P0001';
  end if;

  if p_status = 'approved' then
    assigned := null;
    if claim.target_type = 'market' then
      update public.markets
        set claimed_by = claim.user_id
        where id = claim.target_id
          and (claimed_by is null or claimed_by = claim.user_id)
        returning id into assigned;
    elsif claim.target_type = 'vendor' then
      update public.vendors
        set claimed_by = claim.user_id
        where id = claim.target_id
          and (claimed_by is null or claimed_by = claim.user_id)
        returning id into assigned;
    else
      raise exception 'Unknown claim target';
    end if;
    if assigned is null then
      raise exception 'That listing is already claimed.';
    end if;

    if claim.target_type = 'vendor' then
      update public.profiles
        set role = 'vendor'
        where id = claim.user_id
          and role is distinct from 'admin';
    end if;
  end if;

  update public.claim_requests
    set status = p_status::public.claim_status,
        admin_note = p_note
    where id = p_id;
end;
$$;

revoke all on function public.decide_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_claim(uuid, text, text) to service_role;

create or replace function public.reject_postgis_data_api()
returns void
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private', 'extensions', 'auth'
as $fn$
declare
  path text := lower(coalesce(current_setting('request.path', true), ''));
  rpc text;
  headers json;
  presented text;
  expected text;
begin
  if path = '' then
    return;
  end if;
  path := split_part(path, '?', 1);
  if auth.role() = 'service_role' then
    begin
      headers := current_setting('request.headers', true)::json;
    exception
      when others then
        headers := '{}'::json;
    end;
    presented := headers->>'x-marketregular-gate';
    select token_hash into expected from private.data_api_gate where id;
    if presented is not null
      and length(presented) between 32 and 200
      and expected is not null
      and encode(extensions.digest(convert_to(presented, 'utf8'), 'sha256'), 'hex') = expected
    then
      return;
    end if;
    raise exception 'not allowed' using errcode = '42501';
  end if;

  rpc := substring(path from '/rpc/([^/]+)');
  if rpc is not null then
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
        'delete_owned_stall',
        'set_owned_menu_sections',
        'save_owned_maintenance_opt_outs',
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
  end if;

  if path ~ '/(listing_slug_aliases|posts|reviews|profiles|saves|portal_applications|claim_requests)(/|$)' then
    return;
  end if;

  raise exception 'not allowed' using errcode = '42501';
end;
$fn$;

revoke all on function public.reject_postgis_data_api() from public;
grant execute on function public.reject_postgis_data_api() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
