alter table public.markets
  add column if not exists logo_url text;

alter table public.vendors
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('listing-marks', 'listing-marks', true)
on conflict (id) do nothing;

create policy "public read listing marks"
  on storage.objects for select
  using (bucket_id = 'listing-marks');

create policy "admin insert listing marks"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-marks'
    and public.is_admin()
  );

create policy "admin update listing marks"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-marks' and public.is_admin())
  with check (bucket_id = 'listing-marks' and public.is_admin());

create policy "admin delete listing marks"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-marks' and public.is_admin());
