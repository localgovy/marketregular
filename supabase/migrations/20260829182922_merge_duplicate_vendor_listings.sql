-- One shop seeded under several slugs splits its links, menus and score across rows and
-- shows up as separate cards in the directory. Each pair below shares one official website.
-- magicoven.com is deliberately absent: Magic Oven and Uno Dos Tacoz are separate brands
-- on one operator's site.
create table private.vendor_merge (keep_id uuid not null, drop_id uuid not null);

insert into private.vendor_merge (keep_id, drop_id)
select keep.id, drop_row.id
from (
  values
    ('bitter-better', 'bitter-better-canada'),
    ('bitter-better', 'bitter-better-canda'),
    ('cosmos-baking-studio', 'cosmos-baking'),
    ('don-grilled-steak-tacos-and-brunch', 'don-grilled-tacos-brunch'),
    ('first-fish', 'first-fish-distribution'),
    ('fish-tree-farm', 'fish-tree-farms'),
    ('gebeta', 'gebeta-ethiopian-bbq'),
    ('gebeta', 'gebeta-toronto'),
    ('goodlot-farmstead-brewing-company', 'goodlot-farm-brewing'),
    ('kindred-folk-flowers', 'kindred-folk'),
    ('kinsip-house-of-fine-spirits', 'kinsip'),
    ('link-haus', 'link-haus-fine-sausage'),
    ('many-roads-purveyors', 'many-roads-purveyors-of-eggs-meat-cheese'),
    ('meui', 'meui-kimchi'),
    ('nepali-momo', 'nepali-momos'),
    ('ostrich-land', 'ostrich-land-the-power-of-ostrich'),
    ('potager-du-kanada', 'potager-dukanada'),
    ('red-tape-brewery', 'red-tape'),
    ('sarah-nicole-s-artistry', 'sarah-nicole-artistry'),
    ('sun-ray-orchards', 'sun-ray-farms'),
    ('thames-river-melons', 'thames-river-farms')
) as pair (keep_slug, drop_slug)
join public.vendors keep on keep.slug = pair.keep_slug
join public.vendors drop_row on drop_row.slug = pair.drop_slug;

-- Keep whichever row carried a field, so merging never loses a sourced detail.
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

-- Same hall on both rows: fold the days together rather than dropping one.
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

-- Menus were seeded onto both rows, so only carry over items the keeper lacks.
update public.vendor_menus lm
set vendor_id = m.keep_id
from private.vendor_merge m
where lm.vendor_id = m.drop_id
  and not exists (
    select 1 from public.vendor_menus km
    where km.vendor_id = m.keep_id
      and lower(btrim(km.name)) = lower(btrim(lm.name))
  );

-- Saved lists key on slug, so move them before the slug disappears.
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

drop table private.vendor_merge;

select private.refresh_directory_census();
