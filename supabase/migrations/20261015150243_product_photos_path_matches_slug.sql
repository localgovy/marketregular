-- The object name has to be {subject}/{slug}.ext so a row cannot point at another photo.

alter table public.product_photos drop constraint product_photos_image_url_check;

alter table public.product_photos add constraint product_photos_image_url_check check (
  image_url is null
  or (
    char_length(image_url) <= 500
    and image_url !~ '\.\.|\\|#|\s'
    and image_url ~ (
      '^https://[a-z0-9-]+\.supabase\.(co|in)/storage/v1/object/public/product-photos/'
      || subject
      || '/'
      || slug
      || '\.(jpe?g|png|webp)$'
    )
  )
);
