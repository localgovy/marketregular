-- A market claim must not mark the account as a stall owner.
-- Dotted phone numbers are a normal way to write a Toronto number.
-- A fee refund can leave less than $0.50 of credit; that remainder still counts.

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

  select * into claim from public.claim_requests where id = p_id;
  if not found then
    raise exception 'Claim not found';
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
grant execute on function public.save_owned_vendor(uuid, text, text, text, text, text, text, text, text[]) to authenticated;

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.platform_fee_payments'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%amount_cents%'
  loop
    execute format('alter table public.platform_fee_payments drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.platform_fee_payments
  add constraint platform_fee_payments_amount_cents_check
  check (amount_cents >= 1 and amount_cents <= 100000000);
