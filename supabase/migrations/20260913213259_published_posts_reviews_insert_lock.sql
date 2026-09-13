-- Floor notes belong on published halls. Stop authenticated inserts on the unused reviews table.

revoke insert on table public.reviews from public, anon, authenticated;
revoke insert (user_id, market_id, vendor_id, rating, body, verified_on_site)
  on public.reviews from public, anon, authenticated;

drop policy if exists "auth insert reviews" on public.reviews;

drop policy if exists "posts readable" on public.posts;
create policy "posts readable" on public.posts
  for select
  using (
    flagged = false
    and exists (
      select 1 from public.markets m
      where m.id = market_id
        and m.status = 'published'
    )
  );

drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews
  for select
  using (
    flagged = false
    and (
      (
        market_id is not null
        and exists (
          select 1 from public.markets m
          where m.id = market_id
            and m.status = 'published'
        )
      )
      or (
        vendor_id is not null
        and exists (
          select 1 from public.vendors v
          where v.id = vendor_id
            and v.status = 'published'
        )
      )
    )
  );
