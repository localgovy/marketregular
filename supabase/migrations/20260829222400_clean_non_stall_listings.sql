-- Three problems that make the directory look unmaintained to a visitor and dilute the
-- topic for Google:
--
--   1. Service businesses that bought a booth are published as farmers-market stalls
--      (a tutoring centre, a pharmacy, a gutter installer, a golf-leisurewear brand, a
--      retirement village, car detailing, window installation, cleaning). They are not
--      stalls selling food or goods you can buy at a market, so they move to draft
--      rather than being deleted — the row and its links stay for the desk.
--   2. "Now Looking" is a vacant-stall placeholder from a roster import.
--   3. Three duplicate pairs still split links between two URLs.
--
-- To revert the unpublishing: set status = 'published' for the slugs in the first block.
--
-- status, slug, rating_avg, and review_count are privilege columns. The SQL editor and
-- postgres role are not service_role, so protect_vendor_privilege_columns would
-- raise 42501. Same pattern as 20260829195948_merge_east_olive_supply.

alter table public.vendors disable trigger protect_vendor_privilege_columns;

update public.vendors
set status = 'draft'
where slug in (
  'now-looking',
  'taunton-mills',
  'magic-windows',
  'kumon-math-and-reading-centre-of-stouffville-freel-lane-and-main-st',
  'stouffville-ida-pharmacy',
  'student-shine-car-detailing',
  'mint-golf-club',
  'leaffilter-north-of-canada-inc',
  'michaels-cleaning-company'
);

-- Roster artifacts: an inverted article, a typo, an underscore, and shouting where the
-- shop's own description uses title case.
update public.vendors set name = 'The Duchess of Suds' where slug = 'duchess-of-suds-the';
update public.vendors set name = 'The Grateful Dog' where slug = 'grateful-dog-the';
update public.vendors set name = 'Drinkwalters J.E. Homestead Recipes' where slug = 'drinkwalters-j-e-homestead-receipes';
update public.vendors set name = 'Sha Magma' where slug = 'sha-magma';
update public.vendors set name = 'Loco Fields' where slug = 'loco-fields';

-- Same merge procedure as 20260829182922, for the pairs that import missed.
create table private.vendor_merge (keep_id uuid not null, drop_id uuid not null);

insert into private.vendor_merge (keep_id, drop_id)
select keep.id, drop_row.id
from (
  values
    ('hooked', 'hooked-stouffville'),
    ('pv-s-fresh-fruits-vegetables', 'pv-s-fresh-fruits-veg'),
    ('bruem-designs', 'bruem-design-media')
) as pair (keep_slug, drop_slug)
join public.vendors keep on keep.slug = pair.keep_slug
join public.vendors drop_row on drop_row.slug = pair.drop_slug;

update public.vendors v
set
  about = coalesce(v.about, (
    select d.about from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and btrim(coalesce(d.about, '')) <> '' limit 1)),
  website = coalesce(v.website, (
    select d.website from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and d.website is not null limit 1)),
  phone = coalesce(v.phone, (
    select d.phone from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and d.phone is not null limit 1)),
  instagram = coalesce(v.instagram, (
    select d.instagram from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and d.instagram is not null limit 1)),
  tiktok = coalesce(v.tiktok, (
    select d.tiktok from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and d.tiktok is not null limit 1)),
  facebook = coalesce(v.facebook, (
    select d.facebook from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and d.facebook is not null limit 1)),
  logo_url = coalesce(v.logo_url, (
    select d.logo_url from private.vendor_merge m join public.vendors d on d.id = m.drop_id
    where m.keep_id = v.id and d.logo_url is not null limit 1))
where v.id in (select keep_id from private.vendor_merge);

update public.vendors v
set
  rating_avg = d.rating_avg,
  review_count = d.review_count
from private.vendor_merge m
join public.vendors d on d.id = m.drop_id
where m.keep_id = v.id
  and coalesce(v.review_count, 0) = 0
  and coalesce(d.review_count, 0) > 0;

with extra as (
  select m.keep_id, array_agg(distinct tag) as tags
  from private.vendor_merge m
  join public.vendors d on d.id = m.drop_id
  cross join unnest(d.tags) as tag
  group by m.keep_id
)
update public.vendors v
set tags = (select array_agg(distinct tag order by tag) from unnest(v.tags || extra.tags) as tag)
from extra
where extra.keep_id = v.id;

update public.market_vendors kv
set
  days = (select array_agg(distinct day order by day) from unnest(kv.days || lv.days) as day),
  stall = coalesce(kv.stall, lv.stall)
from private.vendor_merge m
join public.market_vendors lv on lv.vendor_id = m.drop_id
where kv.vendor_id = m.keep_id
  and kv.market_id = lv.market_id;

update public.market_vendors lv
set vendor_id = m.keep_id
from private.vendor_merge m
where lv.vendor_id = m.drop_id
  and not exists (
    select 1 from public.market_vendors kv
    where kv.vendor_id = m.keep_id and kv.market_id = lv.market_id
  );

update public.vendor_menus lm
set vendor_id = m.keep_id
from private.vendor_merge m
where lm.vendor_id = m.drop_id
  and not exists (
    select 1 from public.vendor_menus km
    where km.vendor_id = m.keep_id
      and lower(btrim(km.name)) = lower(btrim(lm.name))
  );

insert into public.saves (user_id, kind, slug, created_at)
select s.user_id, s.kind, keep.slug, s.created_at
from public.saves s
join public.vendors drop_row on drop_row.slug = s.slug
join private.vendor_merge m on m.drop_id = drop_row.id
join public.vendors keep on keep.id = m.keep_id
where s.kind = 'vendor'
on conflict do nothing;

delete from public.saves s
using public.vendors drop_row, private.vendor_merge m
where s.kind = 'vendor'
  and drop_row.slug = s.slug
  and m.drop_id = drop_row.id;

delete from public.vendors where id in (select drop_id from private.vendor_merge);

alter table public.vendors enable trigger protect_vendor_privilege_columns;

drop table private.vendor_merge;

select private.refresh_directory_census();
