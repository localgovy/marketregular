-- A new stall owner must not inherit the last owner's Stripe account, buyers, or fees.
-- A market cannot rewrite a stall while someone is asking to run it.
-- Social buttons stay on that network. The written address stays on the pin.

alter table public.orders
  add column if not exists seller_user_id uuid references public.profiles (id) on delete set null;

alter table public.platform_fee_payments
  add column if not exists seller_user_id uuid references public.profiles (id) on delete set null;

alter table public.platform_fee_sessions
  add column if not exists seller_user_id uuid references public.profiles (id) on delete set null;

alter table public.vendor_stripe_accounts
  add column if not exists owner_user_id uuid references public.profiles (id) on delete set null;

alter table public.vendors
  add column if not exists maintenance_opt_outs text[] not null default '{}';

alter table public.markets
  add column if not exists maintenance_opt_outs text[] not null default '{}';

comment on column public.orders.seller_user_id is
  'Account that owned the stall when the order was placed. A later owner does not see it.';

comment on column public.platform_fee_payments.seller_user_id is
  'Account that owed the fee when it was paid. A later owner does not see it.';

comment on column public.vendor_stripe_accounts.owner_user_id is
  'Account that connected this Stripe account. A later owner does not reuse it.';

update public.orders o
set seller_user_id = v.claimed_by
from public.vendors v
where o.vendor_id = v.id
  and o.seller_user_id is null
  and v.claimed_by is not null;

update public.platform_fee_payments p
set seller_user_id = v.claimed_by
from public.vendors v
where p.vendor_id = v.id
  and p.seller_user_id is null
  and v.claimed_by is not null;

update public.platform_fee_sessions s
set seller_user_id = v.claimed_by
from public.vendors v
where s.vendor_id = v.id
  and s.seller_user_id is null
  and v.claimed_by is not null;

update public.vendor_stripe_accounts s
set owner_user_id = v.claimed_by
from public.vendors v
where s.vendor_id = v.id
  and s.owner_user_id is null
  and v.claimed_by is not null;

create index if not exists orders_seller_idx on public.orders (seller_user_id);

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.reviews'::regclass
      and con.contype = 'f'
      and con.confrelid = 'public.vendors'::regclass
  loop
    execute format('alter table public.reviews drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.reviews
  add constraint reviews_vendor_id_fkey
  foreign key (vendor_id) references public.vendors (id) on delete restrict;

alter table public.mail_sends drop constraint if exists mail_sends_kind_check;
alter table public.mail_sends
  add constraint mail_sends_kind_check
  check (kind in ('claim', 'claim_ip', 'visit', 'catalog', 'signin', 'signin_ip'));

-- ---------------------------------------------------------------------------
-- Social hosts, and a pending request freezes the stall a market created
-- ---------------------------------------------------------------------------

create or replace function public.social_href_ok(p_kind text, value text)
returns boolean
language plpgsql
immutable
set search_path = public
as $fn$
declare
  v text;
  host text;
  root text;
  handle text;
begin
  if value is null then
    return true;
  end if;
  v := btrim(value);
  if v = '' then
    return true;
  end if;
  if char_length(v) > 2048 then
    return false;
  end if;
  if p_kind = 'instagram' then
    root := 'instagram.com';
  elsif p_kind = 'tiktok' then
    root := 'tiktok.com';
  elsif p_kind = 'facebook' then
    root := 'facebook.com';
  else
    return false;
  end if;

  if v !~ '[:/]' then
    handle := regexp_replace(v, '^@+', '');
    return handle ~ '^[A-Za-z0-9._]{1,30}$';
  end if;

  if v !~* '^https?://' then
    return false;
  end if;
  if v ~* '^https?://[^/?#]*@' then
    return false;
  end if;
  host := lower(substring(v from '^https?://([^/:?#]+)'));
  if host is null or host = '' or right(host, 1) = '.' then
    return false;
  end if;
  host := rtrim(host, '.');
  return host = root or right(host, char_length(root) + 1) = '.' || root;
end;
$fn$;

revoke all on function public.social_href_ok(text, text) from public, anon, authenticated;

create or replace function public.guard_listing_hrefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.listing_href_ok(new.website)
    or not public.social_href_ok('instagram', new.instagram)
    or not public.social_href_ok('tiktok', new.tiktok)
    or not public.social_href_ok('facebook', new.facebook)
  then
    raise exception 'Listing URL is not allowed' using errcode = 'P0001';
  end if;
  return new;
end;
$fn$;

revoke all on function public.guard_listing_hrefs() from public, anon, authenticated;

create or replace function public.stall_request_pending(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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
  );
$$;

revoke all on function public.stall_request_pending(uuid) from public, anon, authenticated;

create or replace function public.guard_unclaimed_stall_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if old.claimed_by is not null or not public.stall_request_pending(old.id) then
    return new;
  end if;
  if new.name is distinct from old.name
    or new.about is distinct from old.about
    or new.website is distinct from old.website
    or new.instagram is distinct from old.instagram
    or new.tiktok is distinct from old.tiktok
    or new.facebook is distinct from old.facebook
    or new.phone is distinct from old.phone
    or new.email is distinct from old.email
    or new.tags is distinct from old.tags
    or new.logo_url is distinct from old.logo_url
  then
    raise exception 'Someone has asked to run this stall' using errcode = 'P0001';
  end if;
  return new;
end;
$fn$;

revoke all on function public.guard_unclaimed_stall_request() from public, anon, authenticated;

drop trigger if exists guard_unclaimed_stall_request on public.vendors;
create trigger guard_unclaimed_stall_request
  before update on public.vendors
  for each row
  execute function public.guard_unclaimed_stall_request();

-- ---------------------------------------------------------------------------
-- Leaving a stall drops its payment account from this app
-- ---------------------------------------------------------------------------

create or replace function public.release_stall_commercial_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.claimed_by is not distinct from old.claimed_by then
    return new;
  end if;
  delete from public.vendor_stripe_accounts where vendor_id = old.id;
  new.selling_approved := false;
  return new;
end;
$fn$;

revoke all on function public.release_stall_commercial_state() from public, anon, authenticated;

drop trigger if exists release_stall_commercial_state on public.vendors;
create trigger release_stall_commercial_state
  before update of claimed_by on public.vendors
  for each row
  execute function public.release_stall_commercial_state();

-- ---------------------------------------------------------------------------
-- Password sign-in has its own counter, separate from mail
-- ---------------------------------------------------------------------------

create or replace function public.take_mail_slot(
  p_kind text,
  p_keys text[],
  p_hour_limit integer,
  p_day_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
  hour_count integer;
  day_count integer;
  keys text[];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in ('claim', 'claim_ip', 'visit', 'catalog', 'signin', 'signin_ip') then
    return false;
  end if;
  if p_keys is null or cardinality(p_keys) = 0 then
    return false;
  end if;
  if p_hour_limit < 1 or p_day_limit < 1 then
    return false;
  end if;

  delete from public.mail_sends
  where created_at < now() - interval '48 hours';

  keys := p_keys;
  if p_kind = 'claim_ip' and not ('claim-site' = any (keys)) then
    keys := keys || array['claim-site'];
  end if;

  for k in
    select x from unnest(keys) as x order by 1
  loop
    perform pg_advisory_xact_lock(881122, hashtext(p_kind || ':' || k));
    select count(*) into hour_count
    from public.mail_sends
    where kind = p_kind
      and key_hash = k
      and created_at >= now() - interval '1 hour';
    if hour_count >= p_hour_limit then
      return false;
    end if;
    select count(*) into day_count
    from public.mail_sends
    where kind = p_kind
      and key_hash = k
      and created_at >= now() - interval '24 hours';
    if day_count >= p_day_limit then
      return false;
    end if;
  end loop;

  insert into public.mail_sends (kind, key_hash)
  select p_kind, unnest(keys);
  return true;
end;
$$;

revoke all on function public.take_mail_slot(text, text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.take_mail_slot(text, text[], integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Old claim inserts cannot target a listing someone else already runs
-- ---------------------------------------------------------------------------

create or replace function public.guard_claim_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.admin_note := null;
    if char_length(coalesce(new.evidence, '')) > 8000 then
      raise exception 'Evidence is too long' using errcode = 'P0001';
    end if;
    if new.target_type = 'market' then
      select claimed_by into v_owner
      from public.markets
      where id = new.target_id and status = 'published';
      if not found then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
      if v_owner is not null and v_owner is distinct from auth.uid() then
        raise exception 'Someone else already runs this market' using errcode = 'P0001';
      end if;
    elsif new.target_type = 'vendor' then
      select claimed_by into v_owner
      from public.vendors
      where id = new.target_id and status = 'published';
      if not found then
        raise exception 'That listing is missing' using errcode = 'P0001';
      end if;
      if v_owner is not null and v_owner is distinct from auth.uid() then
        raise exception 'Someone else already runs this stall' using errcode = 'P0001';
      end if;
    else
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.claim_requests
      where user_id = new.user_id
        and created_at >= now() - interval '1 hour'
    ) >= 3 then
      raise exception 'Wait a bit before sending another claim.' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.claim_requests
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Wait a bit before sending another claim.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$fn$;

revoke all on function public.guard_claim_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Owner saves
-- ---------------------------------------------------------------------------

create or replace function public.save_owned_vendor(
  p_id uuid,
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
  v_phone text;
  v_email text;
  v_tags text[];
begin
  if auth.uid() is null or not public.owns_vendor(p_id) then
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
    where id <> p_id
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

  v_phone := nullif(btrim(coalesce(p_phone, '')), '');
  if v_phone is not null and (
    char_length(v_phone) > 40
    or v_phone !~ '^[0-9+().[:space:].-]+$'
    or v_phone !~ '[0-9]'
  ) then
    raise exception 'That phone number is not allowed' using errcode = 'P0001';
  end if;

  v_email := nullif(lower(btrim(coalesce(p_email, ''))), '');
  if v_email is not null and (
    char_length(v_email) > 120
    or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ) then
    raise exception 'That email is not allowed' using errcode = 'P0001';
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
    phone = v_phone,
    email = v_email,
    tags = v_tags
  where id = p_id
    and claimed_by = auth.uid();

  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$fn$;

revoke all on function public.save_owned_vendor(uuid, text, text, text, text, text, text, text, text, text[]) from public, anon;
grant execute on function public.save_owned_vendor(uuid, text, text, text, text, text, text, text, text, text[]) to authenticated;

create or replace function public.save_owned_market(
  p_id uuid,
  p_name text,
  p_about text,
  p_address text,
  p_city text,
  p_province text,
  p_postal_code text,
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
  if auth.uid() is null or not public.owns_market(p_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- p_address, p_city, p_province, and p_postal_code stay unused.
  -- The written place stays on the pin, which only admin can move.

  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Add a name' using errcode = 'P0001';
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

  update public.markets
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
  where id = p_id
    and claimed_by = auth.uid();

  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$fn$;

create or replace function public.save_market_roster(
  p_market_id uuid,
  p_vendor_id uuid,
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
  v_linked boolean;
begin
  if auth.uid() is null or not public.owns_market(p_market_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('owned-market'), hashtext(p_market_id::text));
  perform pg_advisory_xact_lock(hashtext('owned-vendor'), hashtext(p_vendor_id::text));
  perform 1 from public.vendors where id = p_vendor_id for update;

  v_stall := nullif(btrim(coalesce(p_stall, '')), '');
  if v_stall is not null and char_length(v_stall) > 80 then
    raise exception 'Keep the stall label shorter' using errcode = 'P0001';
  end if;

  v_days := public.portal_open_days(p_market_id, p_days);
  v_linked := exists (
    select 1
    from public.market_vendors
    where market_id = p_market_id
      and vendor_id = p_vendor_id
  );

  if not v_linked then
    if not exists (
      select 1
      from public.vendors
      where id = p_vendor_id
        and status = 'published'
    ) then
      raise exception 'That stall is missing' using errcode = 'P0001';
    end if;
    if (select count(*) from public.market_vendors where market_id = p_market_id) >= 200 then
      raise exception 'Stall list is full' using errcode = 'P0001';
    end if;
  elsif not exists (select 1 from public.vendors where id = p_vendor_id) then
    raise exception 'That stall is missing' using errcode = 'P0001';
  end if;

  insert into public.market_vendors (market_id, vendor_id, stall, days)
  values (p_market_id, p_vendor_id, v_stall, v_days)
  on conflict (market_id, vendor_id) do update
  set stall = excluded.stall,
      days = excluded.days;
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
  if public.stall_request_pending(p_vendor_id) then
    raise exception 'Someone has asked to run this stall' using errcode = 'P0001';
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
  perform pg_advisory_xact_lock(hashtext('owned-vendor'), hashtext(p_vendor_id::text));

  select created_by_market_id, claimed_by
  into v_created, v_claimed
  from public.vendors
  where id = p_vendor_id
  for update;

  delete from public.market_vendors
  where market_id = p_market_id
    and vendor_id = p_vendor_id;

  if not found then
    raise exception 'That stall is missing' using errcode = 'P0001';
  end if;

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

  if public.stall_request_pending(p_vendor_id) then
    return 'kept:request';
  end if;

  if exists (
    select 1 from public.reviews where vendor_id = p_vendor_id
  ) then
    return 'kept:review';
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
      if exists (select 1 from public.reviews where vendor_id = p_vendor_id) then
        return 'kept:review';
      end if;
      return 'kept:order';
  end;
end;
$fn$;

revoke all on function public.delete_market_roster(uuid, uuid) from public, anon;
grant execute on function public.delete_market_roster(uuid, uuid) to authenticated;

create or replace function public.set_market_vendor_logo(
  p_market_id uuid,
  p_vendor_id uuid,
  p_logo_url text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_logo_url is not null and char_length(p_logo_url) > 2048 then
    raise exception 'Logo URL is not allowed' using errcode = 'P0001';
  end if;

  update public.vendors
  set logo_url = p_logo_url
  where id = p_vendor_id
    and created_by_market_id = p_market_id
    and claimed_by is null
    and exists (
      select 1
      from public.market_vendors roster
      where roster.market_id = p_market_id
        and roster.vendor_id = p_vendor_id
    )
    and not public.stall_request_pending(p_vendor_id);

  return found;
end;
$fn$;

revoke all on function public.set_market_vendor_logo(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_market_vendor_logo(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- The stall portal only shows this owner's orders and fees
-- ---------------------------------------------------------------------------

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

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (
    buyer_id = auth.uid()
    or (
      seller_user_id = auth.uid()
      and status in ('paid', 'partially_refunded', 'refunded')
      and public.owns_vendor(vendor_id)
    )
  );

drop policy if exists platform_fees_select on public.platform_fees;
create policy platform_fees_select on public.platform_fees
  for select to authenticated
  using (
    public.owns_vendor(vendor_id)
    and exists (
      select 1
      from public.orders o
      where o.id = order_id
        and o.seller_user_id = auth.uid()
    )
  );

drop policy if exists platform_fee_payments_select on public.platform_fee_payments;
create policy platform_fee_payments_select on public.platform_fee_payments
  for select to authenticated
  using (
    seller_user_id = auth.uid()
    and public.owns_vendor(vendor_id)
  );
