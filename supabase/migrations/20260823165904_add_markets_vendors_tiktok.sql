alter table public.vendors
  add column if not exists tiktok text;

alter table public.markets
  add column if not exists tiktok text;
