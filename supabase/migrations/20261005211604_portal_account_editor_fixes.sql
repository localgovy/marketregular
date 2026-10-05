-- Portal signup, claim decisions, and editor saves share one set of rules.
-- A taken listing cannot be requested. A claim is decided once.
-- The password lock reads the live account flag, not a stale token.
-- Hours, slugs, stall names, and roster removal match what the editor shows.

create or replace function public.portal_season_day_ok(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_value ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    and split_part(p_value, '-', 2)::int <=
      (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[split_part(p_value, '-', 1)::int];
$$;

revoke all on function public.portal_season_day_ok(text) from public, anon, authenticated;

create or replace function public.password_change_pending()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (raw_app_meta_data ->> 'must_set_password') = 'true'
      from auth.users
      where id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.password_change_pending() from public, anon, authenticated;

create or replace function public.guard_portal_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  new.user_id := auth.uid();
  new.status := 'pending';
  new.assigned_target_id := null;
  if tg_op = 'UPDATE' then
    new.kind := old.kind;
    new.created_at := old.created_at;
  end if;

  if new.requested_target_id is not null then
    new.organization_name := null;
    if new.kind = 'market' then
      select claimed_by into v_owner
      from public.markets
      where id = new.requested_target_id and status = 'published';
      if not found then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
      if v_owner is not null and v_owner is distinct from auth.uid() then
        raise exception 'Someone else already runs this market' using errcode = 'P0001';
      end if;
    elsif new.kind = 'vendor' then
      select claimed_by into v_owner
      from public.vendors
      where id = new.requested_target_id and status = 'published';
      if not found then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
      if v_owner is not null and v_owner is distinct from auth.uid() then
        raise exception 'Someone else already runs this stall' using errcode = 'P0001';
      end if;
    else
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
  else
    new.organization_name := nullif(btrim(coalesce(new.organization_name, '')), '');
    if new.organization_name is null then
      raise exception 'Add the organization name' using errcode = 'P0001';
    end if;
    if char_length(new.organization_name) > 120 then
      raise exception 'Keep the organization name shorter' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if (
      select count(*) from public.portal_applications
      where user_id = new.user_id
        and created_at >= now() - interval '1 hour'
    ) >= 3 then
      raise exception 'Wait a bit before sending another request.' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.portal_applications
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Wait a bit before sending another request.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$fn$;

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

create or replace function public.portal_vendor_slug(p_name text)
returns text
language plpgsql
volatile
set search_path = public
as $fn$
declare
  v_slug text;
  v_candidate text;
  v_n integer;
begin
  v_slug := lower(btrim(coalesce(p_name, '')));
  v_slug := replace(v_slug, 'œ', 'oe');
  v_slug := replace(v_slug, 'æ', 'ae');
  v_slug := translate(
    v_slug,
    'àáâãäåāèéêëēìíîïīòóôõöōùúûüūýÿñç',
    'aaaaaaaeeeeeiiiiioooooouuuuuyync'
  );
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  v_slug := left(v_slug, 72);
  v_slug := regexp_replace(v_slug, '-+$', '', 'g');
  if v_slug = '' or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'That name needs letters or numbers' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('market-vendor-slug'), hashtext(v_slug));
  v_candidate := v_slug;
  v_n := 2;
  while exists (select 1 from public.vendors where slug = v_candidate) loop
    v_candidate := v_slug || '-' || v_n::text;
    v_n := v_n + 1;
    if v_n > 100 then
      raise exception 'That stall is already listed. Add it from search' using errcode = 'P0001';
    end if;
  end loop;
  return v_candidate;
end;
$fn$;

create or replace function public.save_owned_schedule(
  p_market_id uuid,
  p_schedule_id uuid,
  p_weekday smallint,
  p_opens text,
  p_closes text,
  p_season_start text,
  p_season_end text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_opens time;
  v_closes time;
  v_start text;
  v_end text;
  v_notes text;
  v_open smallint[];
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  if p_weekday is null or p_weekday < 0 or p_weekday > 6 then
    raise exception 'Those hours are not allowed' using errcode = 'P0001';
  end if;
  if coalesce(p_opens, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or coalesce(p_closes, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  then
    raise exception 'Those hours are not allowed' using errcode = 'P0001';
  end if;
  v_opens := p_opens::time;
  v_closes := p_closes::time;
  if v_opens >= v_closes then
    raise exception 'Open has to be before close' using errcode = 'P0001';
  end if;

  v_start := nullif(btrim(coalesce(p_season_start, '')), '');
  v_end := nullif(btrim(coalesce(p_season_end, '')), '');
  if (v_start is null) is distinct from (v_end is null)
    or (v_start is not null and not public.portal_season_day_ok(v_start))
    or (v_end is not null and not public.portal_season_day_ok(v_end))
  then
    raise exception 'That season is not allowed' using errcode = 'P0001';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'Keep the notes shorter' using errcode = 'P0001';
  end if;

  if p_schedule_id is null and (
    select count(*) from public.market_schedules where market_id = p_market_id
  ) >= 24 then
    raise exception 'Hours list is full' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct weekday order by weekday), '{}'::smallint[])
  into v_open
  from (
    select ms.weekday
    from public.market_schedules ms
    where ms.market_id = p_market_id
      and (p_schedule_id is null or ms.id is distinct from p_schedule_id)
    union all
    select p_weekday
  ) next_hours;

  if exists (
    select 1
    from public.market_vendors mv
    cross join lateral unnest(coalesce(mv.days, '{}'::smallint[])) as d(day)
    where mv.market_id = p_market_id
      and not (d.day = any (v_open))
  ) then
    raise exception 'A stall is still set for that day' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.market_schedules existing
    where existing.market_id = p_market_id
      and (p_schedule_id is null or existing.id is distinct from p_schedule_id)
      and existing.weekday = p_weekday
      and existing.opens_at = v_opens
      and existing.closes_at = v_closes
      and existing.season_start is not distinct from v_start
      and existing.season_end is not distinct from v_end
  ) then
    raise exception 'Those hours are already listed' using errcode = 'P0001';
  end if;

  if p_schedule_id is null then
    insert into public.market_schedules (
      market_id, weekday, opens_at, closes_at, season_start, season_end, notes
    ) values (
      p_market_id, p_weekday, v_opens, v_closes, v_start, v_end, v_notes
    );
    return;
  end if;

  update public.market_schedules
  set
    weekday = p_weekday,
    opens_at = v_opens,
    closes_at = v_closes,
    season_start = v_start,
    season_end = v_end,
    notes = v_notes
  where id = p_schedule_id
    and market_id = p_market_id;

  if not found then
    raise exception 'Those hours are missing' using errcode = 'P0001';
  end if;
end;
$fn$;

create or replace function public.create_market_vendor(
  p_market_id uuid,
  p_name text,
  p_about text,
  p_website text,
  p_instagram text,
  p_tiktok text,
  p_facebook text,
  p_phone text,
  p_email text,
  p_tags text[],
  p_stall text,
  p_days smallint[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_about text;
  v_website text;
  v_instagram text;
  v_tiktok text;
  v_facebook text;
  v_stall text;
  v_days smallint[];
  v_tags text[];
  v_slug text;
  v_id uuid;
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Add a name' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('market-vendor-name'), hashtext(lower(v_name)));
  if exists (
    select 1
    from public.vendors
    where lower(btrim(name)) = lower(v_name)
  ) then
    raise exception 'That stall is already listed. Add it from search' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.vendors where created_by_market_id = p_market_id
  ) >= 80 then
    raise exception 'This market cannot add more stalls' using errcode = 'P0001';
  end if;
  if (select count(*) from public.market_vendors where market_id = p_market_id) >= 200 then
    raise exception 'Stall list is full' using errcode = 'P0001';
  end if;

  v_about := nullif(btrim(coalesce(p_about, '')), '');
  if v_about is not null and char_length(v_about) > 4000 then
    raise exception 'Keep the about shorter' using errcode = 'P0001';
  end if;

  v_website := nullif(btrim(coalesce(p_website, '')), '');
  v_instagram := nullif(btrim(coalesce(p_instagram, '')), '');
  v_tiktok := nullif(btrim(coalesce(p_tiktok, '')), '');
  v_facebook := nullif(btrim(coalesce(p_facebook, '')), '');
  if char_length(coalesce(v_website, '')) > 2048
    or char_length(coalesce(v_instagram, '')) > 2048
    or char_length(coalesce(v_tiktok, '')) > 2048
    or char_length(coalesce(v_facebook, '')) > 2048
  then
    raise exception 'Listing URL is not allowed' using errcode = 'P0001';
  end if;

  v_stall := nullif(btrim(coalesce(p_stall, '')), '');
  if v_stall is not null and char_length(v_stall) > 80 then
    raise exception 'Keep the stall label shorter' using errcode = 'P0001';
  end if;
  v_days := public.portal_open_days(p_market_id, p_days);
  v_tags := public.portal_tags(p_tags, 24);
  v_slug := public.portal_vendor_slug(v_name);
  v_id := gen_random_uuid();

  insert into public.vendors (
    id,
    slug,
    name,
    about,
    website,
    instagram,
    tiktok,
    facebook,
    phone,
    email,
    tags,
    status,
    claimed_by,
    selling_approved,
    created_by_market_id
  ) values (
    v_id,
    v_slug,
    v_name,
    v_about,
    v_website,
    v_instagram,
    v_tiktok,
    v_facebook,
    public.portal_phone(p_phone),
    public.portal_email(p_email),
    v_tags,
    'published',
    null,
    false,
    p_market_id
  );

  insert into public.market_vendors (market_id, vendor_id, stall, days)
  values (p_market_id, v_id, v_stall, v_days);

  return v_id;
end;
$fn$;

create or replace function public.save_market_vendor_profile(
  p_market_id uuid,
  p_vendor_id uuid,
  p_name text,
  p_about text,
  p_website text,
  p_instagram text,
  p_tiktok text,
  p_facebook text,
  p_phone text,
  p_email text,
  p_tags text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_about text;
  v_website text;
  v_instagram text;
  v_tiktok text;
  v_facebook text;
  v_tags text[];
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Add a name' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('market-vendor-name'), hashtext(lower(v_name)));
  if exists (
    select 1
    from public.vendors
    where id <> p_vendor_id
      and lower(btrim(name)) = lower(v_name)
  ) then
    raise exception 'That stall is already listed. Add it from search' using errcode = 'P0001';
  end if;

  v_about := nullif(btrim(coalesce(p_about, '')), '');
  if v_about is not null and char_length(v_about) > 4000 then
    raise exception 'Keep the about shorter' using errcode = 'P0001';
  end if;

  v_website := nullif(btrim(coalesce(p_website, '')), '');
  v_instagram := nullif(btrim(coalesce(p_instagram, '')), '');
  v_tiktok := nullif(btrim(coalesce(p_tiktok, '')), '');
  v_facebook := nullif(btrim(coalesce(p_facebook, '')), '');
  if char_length(coalesce(v_website, '')) > 2048
    or char_length(coalesce(v_instagram, '')) > 2048
    or char_length(coalesce(v_tiktok, '')) > 2048
    or char_length(coalesce(v_facebook, '')) > 2048
  then
    raise exception 'Listing URL is not allowed' using errcode = 'P0001';
  end if;

  v_tags := public.portal_tags(p_tags, 24);

  update public.vendors
  set
    name = v_name,
    about = v_about,
    website = v_website,
    instagram = v_instagram,
    tiktok = v_tiktok,
    facebook = v_facebook,
    phone = public.portal_phone(p_phone),
    email = public.portal_email(p_email),
    tags = v_tags
  where id = p_vendor_id
    and created_by_market_id = p_market_id
    and claimed_by is null
    and exists (
      select 1
      from public.market_vendors roster
      where roster.market_id = p_market_id
        and roster.vendor_id = p_vendor_id
    );

  if not found then
    raise exception 'That stall is not yours to edit' using errcode = 'P0001';
  end if;
end;
$fn$;

create or replace function public.save_owned_stall(
  p_vendor_id uuid,
  p_market_id uuid,
  p_stall text,
  p_days smallint[]
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_stall text;
  v_days smallint[];
  v_open smallint[];
begin
  if auth.uid() is null or not public.owns_vendor(p_vendor_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.market_vendors
    where market_id = p_market_id
      and vendor_id = p_vendor_id
  ) and not exists (
    select 1
    from public.markets
    where id = p_market_id
      and status = 'published'
  ) then
    raise exception 'That market is missing' using errcode = 'P0001';
  end if;

  v_stall := nullif(btrim(coalesce(p_stall, '')), '');
  if v_stall is not null and char_length(v_stall) > 80 then
    raise exception 'Keep the stall label shorter' using errcode = 'P0001';
  end if;

  if p_days is null or cardinality(p_days) = 0 then
    raise exception 'Pick at least one day the market is open' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(p_days) as d
    where d is null or d < 0 or d > 6
  ) then
    raise exception 'Pick days the market is open' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(distinct d order by d), '{}'::smallint[])
  into v_days
  from unnest(p_days) as d;

  select coalesce(array_agg(distinct weekday order by weekday), '{}'::smallint[])
  into v_open
  from public.market_schedules
  where market_id = p_market_id;

  if cardinality(v_open) = 0 then
    raise exception 'That market has no hours yet' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from unnest(v_days) as d
    where not (d = any (v_open))
  ) then
    raise exception 'Pick days the market is open' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.market_vendors
    where market_id = p_market_id
      and vendor_id = p_vendor_id
  ) and (
    select count(*) from public.market_vendors where vendor_id = p_vendor_id
  ) >= 40 then
    raise exception 'Stall list is full' using errcode = 'P0001';
  end if;

  insert into public.market_vendors (market_id, vendor_id, stall, days)
  values (p_market_id, p_vendor_id, v_stall, v_days)
  on conflict (market_id, vendor_id) do update
  set stall = excluded.stall,
      days = excluded.days;
end;
$fn$;

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

drop function if exists public.delete_market_roster(uuid, uuid);

create or replace function public.delete_market_roster(p_market_id uuid, p_vendor_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_created uuid;
  v_claimed uuid;
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));

  delete from public.market_vendors
  where market_id = p_market_id
    and vendor_id = p_vendor_id;

  if not found then
    raise exception 'That stall is missing' using errcode = 'P0001';
  end if;

  select created_by_market_id, claimed_by
  into v_created, v_claimed
  from public.vendors
  where id = p_vendor_id;

  if v_created is distinct from p_market_id or v_claimed is not null then
    return 'kept';
  end if;

  if exists (
    select 1 from public.market_vendors other where other.vendor_id = p_vendor_id
  ) then
    return 'kept:market';
  end if;

  if exists (
    select 1 from public.orders where vendor_id = p_vendor_id
  ) then
    return 'kept:order';
  end if;

  if exists (
    select 1
    from public.portal_applications
    where kind = 'vendor'
      and status = 'pending'
      and requested_target_id = p_vendor_id
  ) or exists (
    select 1
    from public.claim_requests
    where target_type = 'vendor'
      and status = 'pending'
      and target_id = p_vendor_id
  ) then
    return 'kept:request';
  end if;

  begin
    delete from public.vendors
    where id = p_vendor_id
      and created_by_market_id = p_market_id
      and claimed_by is null;
    if found then
      return 'deleted';
    end if;
    return 'kept';
  exception
    when foreign_key_violation then
      return 'kept:order';
  end;
end;
$fn$;

revoke all on function public.delete_market_roster(uuid, uuid) from public, anon;
grant execute on function public.delete_market_roster(uuid, uuid) to authenticated;

update public.market_schedules
set season_start = null,
    season_end = null
where (season_start is null) is distinct from (season_end is null)
   or (season_start is not null and not public.portal_season_day_ok(season_start))
   or (season_end is not null and not public.portal_season_day_ok(season_end));
