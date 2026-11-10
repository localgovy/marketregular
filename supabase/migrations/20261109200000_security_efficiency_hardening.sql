-- Rate-limit kinds for site mail, password reset, and owner saves.
-- Storage list policy, census read, admin notes, auth.uid() initplans,
-- pending-request indexes, the Data API denylist, and post photo paths.

alter table public.mail_sends drop constraint mail_sends_kind_check;

alter table public.mail_sends add constraint mail_sends_kind_check
  check (kind = any (array[
    'claim'::text,
    'claim_ip'::text,
    'visit'::text,
    'catalog'::text,
    'signin'::text,
    'signin_ip'::text,
    'mail_site'::text,
    'reset'::text,
    'owner_save'::text
  ]));

create or replace function public.take_mail_slot(
  p_kind text,
  p_keys text[],
  p_hour_limit integer,
  p_day_limit integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  k text;
  hour_count integer;
  day_count integer;
  keys text[];
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_kind not in (
    'claim', 'claim_ip', 'visit', 'catalog', 'signin', 'signin_ip',
    'mail_site', 'reset', 'owner_save'
  ) then
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
$fn$;

drop policy "public read product photos" on storage.objects;

revoke select (admin_note) on public.claim_requests from authenticated;

drop policy "census readable" on public.directory_census;

create policy "census readable"
  on public.directory_census
  for select
  to public
  using (false);

create or replace function public.password_change_pending()
returns boolean
language sql
stable
set search_path to 'public'
as $fn$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'must_set_password', '') = 'true';
$fn$;

create or replace function public.owns_vendor(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select not public.password_change_pending()
    and exists (
      select 1
      from public.vendors
      where id = p_id
        and claimed_by = (select auth.uid())
    );
$fn$;

create or replace function public.owns_market(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $fn$
  select not public.password_change_pending()
    and exists (
      select 1
      from public.markets
      where id = p_id
        and claimed_by = (select auth.uid())
    );
$fn$;

drop policy "auth read own post photos" on storage.objects;

create policy "auth read own post photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create index if not exists claim_requests_pending_target_idx
  on public.claim_requests (target_type, target_id)
  where status = 'pending';

create index if not exists portal_applications_pending_target_idx
  on public.portal_applications (kind, requested_target_id)
  where status = 'pending';

create or replace function public.reject_postgis_data_api()
returns void
language plpgsql
stable
set search_path to 'public'
as $fn$
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
    or path ~ '/(published_markets|published_vendors|published_menus|published_schedules|published_stalls|market_schedules|market_vendors|vendor_menus|product_synonyms|menu_classifiers|vendor_menu_classifier_assignments|vendor_menu_classifier_reviews|search_terms|search_term_classifiers|directory_census|markets|vendors|vendor_stripe_accounts|vendor_sign_in_secrets|orders|platform_fees|platform_fee_payments|platform_fee_sessions|product_photos|menu_item_photos)(/|$)'
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
$fn$;

create or replace function public.guard_post_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  photo text;
  prefix text;
  name text;
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id := auth.uid();
    new.verified_on_site := false;
    new.flagged := false;
    new.created_at := now();
    if not exists (
      select 1 from public.markets
      where id = new.market_id and status = 'published'
    ) then
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if coalesce(cardinality(new.photos), 0) > 8 then
      raise exception 'Too many photos' using errcode = 'P0001';
    end if;
    if new.photos is not null then
      prefix := 'https://pxsndrlptceafhsxfays.supabase.co/storage/v1/object/public/post-photos/'
        || new.user_id::text
        || '/';
      foreach photo in array new.photos
      loop
        name := substring(photo from char_length(prefix) + 1);
        if photo is null
          or char_length(photo) > 2048
          or left(photo, char_length(prefix)) is distinct from prefix
          or name !~ '^[A-Za-z0-9._-]+$'
          or name ~ '\.\.'
        then
          raise exception 'Photo URL is not allowed' using errcode = 'P0001';
        end if;
      end loop;
    end if;
    if exists (
      select 1
      from public.posts p
      where p.user_id = new.user_id
        and p.flagged = true
        and md5(lower(trim(p.body))) = md5(lower(trim(new.body)))
        and p.created_at >= now() - interval '90 days'
    ) then
      raise exception 'This post was removed' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.posts
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Daily review limit reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$fn$;
