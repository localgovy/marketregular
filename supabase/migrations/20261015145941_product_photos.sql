-- Aisle, find-page, and products-page hero images.
-- Empty until seeded. Service role only. No anon or authenticated access.

create table public.product_photos (
  subject text not null,
  slug text not null,
  image_url text,
  alt text not null,
  constraint product_photos_pkey primary key (subject, slug),
  constraint product_photos_subject_check check (subject in ('aisle', 'product', 'hero')),
  constraint product_photos_slug_check check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) <= 80
  ),
  constraint product_photos_hero_slug_check check (subject <> 'hero' or slug = 'products'),
  constraint product_photos_alt_check check (char_length(btrim(alt)) between 1 and 160),
  constraint product_photos_image_url_check check (
    image_url is null
    or (
      char_length(image_url) <= 500
      and image_url !~ '\.\.|\\|#|\s'
      and (
        (
          subject = 'aisle'
          and image_url ~ '^https://[a-z0-9-]+\.supabase\.(co|in)/storage/v1/object/public/product-photos/aisle/[a-z0-9][a-z0-9-]{0,80}\.(jpe?g|png|webp)$'
        )
        or (
          subject = 'product'
          and image_url ~ '^https://[a-z0-9-]+\.supabase\.(co|in)/storage/v1/object/public/product-photos/product/[a-z0-9][a-z0-9-]{0,80}\.(jpe?g|png|webp)$'
        )
        or (
          subject = 'hero'
          and image_url ~ '^https://[a-z0-9-]+\.supabase\.(co|in)/storage/v1/object/public/product-photos/hero/products\.(jpe?g|png|webp)$'
        )
      )
    )
  )
);

comment on table public.product_photos is
  'Aisle, find-page, and products-page hero images. Empty until seeded. Service role only.';

alter table public.product_photos enable row level security;

revoke all on table public.product_photos from public, anon, authenticated;
grant select, insert, update, delete on table public.product_photos to service_role;

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-photos';

create policy "public read product photos"
  on storage.objects for select
  using (bucket_id = 'product-photos');
