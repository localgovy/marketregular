-- Same shop seeded twice (choosetoinfuze.ca vs www.choosetoinfuze.ca).
-- Keep the row that has menus, a mark, and TikTok; copy Instagram from the other;
-- fold the Stouffville hall onto it; then use the cleaner public slug.
do $$
declare
  keep_id uuid;
  drop_id uuid;
  keep_slug text := 'the-east-olive-supply-co-choose-to-infuse';
  public_slug text := 'the-east-olive-supply-company';
begin
  select id into keep_id from public.vendors where slug = keep_slug;
  select id into drop_id from public.vendors where slug = public_slug;

  if keep_id is null or drop_id is null then
    raise notice 'east olive pair already merged';
    return;
  end if;

  update public.vendors keep
  set
    instagram = coalesce(keep.instagram, drop_row.instagram),
    tiktok = coalesce(keep.tiktok, drop_row.tiktok),
    facebook = coalesce(keep.facebook, drop_row.facebook),
    phone = coalesce(keep.phone, drop_row.phone),
    logo_url = coalesce(keep.logo_url, drop_row.logo_url),
    website = coalesce(keep.website, drop_row.website),
    about = coalesce(keep.about, drop_row.about),
    tags = (
      select coalesce(array_agg(distinct tag order by tag), '{}')
      from unnest(keep.tags || drop_row.tags) as tag
    )
  from public.vendors drop_row
  where keep.id = keep_id
    and drop_row.id = drop_id;

  update public.market_vendors kv
  set
    days = (select array_agg(distinct day order by day) from unnest(kv.days || lv.days) as day),
    stall = coalesce(kv.stall, lv.stall)
  from public.market_vendors lv
  where kv.vendor_id = keep_id
    and lv.vendor_id = drop_id
    and kv.market_id = lv.market_id;

  update public.market_vendors lv
  set vendor_id = keep_id
  where lv.vendor_id = drop_id
    and not exists (
      select 1 from public.market_vendors kv
      where kv.vendor_id = keep_id and kv.market_id = lv.market_id
    );

  update public.vendor_menus lm
  set vendor_id = keep_id
  where lm.vendor_id = drop_id
    and not exists (
      select 1 from public.vendor_menus km
      where km.vendor_id = keep_id
        and lower(btrim(km.name)) = lower(btrim(lm.name))
    );

  update public.reviews
  set vendor_id = keep_id
  where vendor_id = drop_id
    and not exists (
      select 1 from public.reviews kr
      where kr.vendor_id = keep_id and kr.user_id = reviews.user_id
    );

  update public.claim_requests
  set target_id = keep_id
  where target_type = 'vendor'
    and target_id = drop_id;

  insert into public.saves (user_id, kind, slug, created_at)
  select s.user_id, s.kind, keep_slug, s.created_at
  from public.saves s
  where s.kind = 'vendor' and s.slug = public_slug
  on conflict do nothing;

  delete from public.saves
  where kind = 'vendor' and slug = public_slug;

  delete from public.vendors where id = drop_id;

  -- Slug is a privilege column for claimants; this migration runs as postgres.
  alter table public.vendors disable trigger protect_vendor_privilege_columns;
  update public.vendors
  set slug = public_slug
  where id = keep_id;
  alter table public.vendors enable trigger protect_vendor_privilege_columns;

  insert into public.saves (user_id, kind, slug, created_at)
  select s.user_id, s.kind, public_slug, s.created_at
  from public.saves s
  where s.kind = 'vendor' and s.slug = keep_slug
  on conflict do nothing;

  delete from public.saves
  where kind = 'vendor' and slug = keep_slug;
end $$;

select private.refresh_directory_census();
