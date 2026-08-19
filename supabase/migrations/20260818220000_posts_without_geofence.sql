-- Posts and reviews do not require a geofence match. verified_on_site is
-- optional, set only when the writer chooses to share location and is nearby.

drop policy if exists "auth insert posts" on public.posts;
create policy "auth insert posts" on public.posts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "auth insert reviews" on public.reviews;
create policy "auth insert reviews" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id);
