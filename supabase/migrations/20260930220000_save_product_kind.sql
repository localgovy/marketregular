-- A product listing clipped from a find page or product search:
-- stall, items, prices, markets, hours, and review scores.

alter table public.saves drop constraint if exists saves_kind_check;

alter table public.saves
  add constraint saves_kind_check
  check (kind in ('market', 'vendor', 'blog', 'listing', 'product'));

alter table public.saves drop constraint if exists saves_product_detail_check;

alter table public.saves
  add constraint saves_product_detail_check
  check (kind <> 'product' or detail is not null);

-- Blog clips stay at 4 KB. A product listing keeps the stall, its items, and each market.
alter table public.saves drop constraint if exists saves_detail_size_check;

alter table public.saves
  add constraint saves_detail_size_check
  check (
    detail is null
    or (
      jsonb_typeof(detail) = 'object'
      and octet_length(detail::text) <= case when kind = 'product' then 16384 else 4096 end
    )
  );
