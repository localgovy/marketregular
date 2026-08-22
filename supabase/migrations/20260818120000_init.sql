-- MarketRegular schema: directory, presence, moderation, claims
create extension if not exists postgis;
create extension if not exists pg_trgm;

create type public.user_role as enum ('user', 'vendor', 'admin');
create type public.listing_status as enum ('draft', 'published');
create type public.claim_status as enum ('pending', 'approved', 'rejected');
create type public.claim_target as enum ('market', 'vendor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  about text,
  address text not null,
  city text not null,
  province text not null,
  postal_code text,
  lat double precision not null,
  lng double precision not null,
  geofence_radius_m integer not null default 250,
  website text,
  phone text,
  email text,
  tags text[] not null default '{}',
  status public.listing_status not null default 'draft',
  featured boolean not null default false,
  claimed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_schedules (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  season_start text,
  season_end text,
  notes text
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  about text,
  website text,
  phone text,
  tags text[] not null default '{}',
  status public.listing_status not null default 'draft',
  claimed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.market_vendors (
  market_id uuid not null references public.markets (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  stall text,
  days smallint[] not null default '{}',
  primary key (market_id, vendor_id)
);

create table public.vendor_menus (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer,
  season text,
  dietary text[] not null default '{}'
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid not null references public.markets (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  photos text[] not null default '{}',
  verified_on_site boolean not null default false,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  market_id uuid references public.markets (id) on delete cascade,
  vendor_id uuid references public.vendors (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 4000),
  verified_on_site boolean not null default false,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  check (market_id is not null or vendor_id is not null)
);

create unique index reviews_user_market_idx
  on public.reviews (user_id, market_id)
  where market_id is not null and vendor_id is null;

create unique index reviews_user_vendor_idx
  on public.reviews (user_id, vendor_id)
  where vendor_id is not null;

create table public.claim_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.claim_target not null,
  target_id uuid not null,
  evidence text not null,
  status public.claim_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index markets_city_idx on public.markets (city);
create index markets_province_idx on public.markets (province);
create index markets_status_idx on public.markets (status);
create index markets_name_trgm_idx on public.markets using gin (name gin_trgm_ops);
create index vendors_name_trgm_idx on public.vendors using gin (name gin_trgm_ops);
create index posts_created_idx on public.posts (created_at desc);
create index posts_market_idx on public.posts (market_id, created_at desc);
create index reviews_market_idx on public.reviews (market_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger markets_updated_at before update on public.markets
  for each row execute function public.set_updated_at();
create trigger vendors_updated_at before update on public.vendors
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger claims_updated_at before update on public.claim_requests
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_list text := coalesce(current_setting('app.admin_emails', true), '');
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_within_market(p_market_id uuid, p_lat double precision, p_lng double precision)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.markets m
    where m.id = p_market_id
      and m.status = 'published'
      and st_dwithin(
        st_setsrid(st_makepoint(m.lng, m.lat), 4326)::geography,
        st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
        m.geofence_radius_m
      )
  );
$$;

create or replace function public.nearby_markets(p_lat double precision, p_lng double precision, p_radius_m integer default 50000)
returns table (
  id uuid,
  distance_m double precision
)
language sql
stable
as $$
  select
    m.id,
    st_distance(
      st_setsrid(st_makepoint(m.lng, m.lat), 4326)::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.markets m
  where m.status = 'published'
    and st_dwithin(
      st_setsrid(st_makepoint(m.lng, m.lat), 4326)::geography,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
  order by distance_m;
$$;

alter table public.profiles enable row level security;
alter table public.markets enable row level security;
alter table public.market_schedules enable row level security;
alter table public.vendors enable row level security;
alter table public.market_vendors enable row level security;
alter table public.vendor_menus enable row level security;
alter table public.posts enable row level security;
alter table public.reviews enable row level security;
alter table public.claim_requests enable row level security;

create policy "profiles are readable" on public.profiles
  for select using (true);

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "admin update profiles" on public.profiles
  for update using (public.is_admin());

create policy "published markets readable" on public.markets
  for select using (status = 'published' or public.is_admin() or claimed_by = auth.uid());

create policy "admin write markets" on public.markets
  for all using (public.is_admin()) with check (public.is_admin());

create policy "claimant update market" on public.markets
  for update using (claimed_by = auth.uid())
  with check (claimed_by = auth.uid());

create policy "schedules readable" on public.market_schedules
  for select using (
    exists (
      select 1 from public.markets m
      where m.id = market_id and (m.status = 'published' or public.is_admin() or m.claimed_by = auth.uid())
    )
  );

create policy "admin write schedules" on public.market_schedules
  for all using (public.is_admin()) with check (public.is_admin());

create policy "claimant write schedules" on public.market_schedules
  for all using (
    exists (select 1 from public.markets m where m.id = market_id and m.claimed_by = auth.uid())
  )
  with check (
    exists (select 1 from public.markets m where m.id = market_id and m.claimed_by = auth.uid())
  );

create policy "published vendors readable" on public.vendors
  for select using (status = 'published' or public.is_admin() or claimed_by = auth.uid());

create policy "admin write vendors" on public.vendors
  for all using (public.is_admin()) with check (public.is_admin());

create policy "claimant update vendor" on public.vendors
  for update using (claimed_by = auth.uid()) with check (claimed_by = auth.uid());

create policy "market vendors readable" on public.market_vendors
  for select using (true);

create policy "admin write market vendors" on public.market_vendors
  for all using (public.is_admin()) with check (public.is_admin());

create policy "menus readable" on public.vendor_menus
  for select using (true);

create policy "admin write menus" on public.vendor_menus
  for all using (public.is_admin()) with check (public.is_admin());

create policy "claimant write menus" on public.vendor_menus
  for all using (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.claimed_by = auth.uid())
  )
  with check (
    exists (select 1 from public.vendors v where v.id = vendor_id and v.claimed_by = auth.uid())
  );

create policy "posts readable" on public.posts
  for select using (flagged = false or public.is_admin() or user_id = auth.uid());

create policy "auth insert posts" on public.posts
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users delete own posts" on public.posts
  for delete using (auth.uid() = user_id or public.is_admin());

create policy "admin update posts" on public.posts
  for update using (public.is_admin());

create policy "reviews readable" on public.reviews
  for select using (flagged = false or public.is_admin() or user_id = auth.uid());

create policy "auth insert reviews" on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "admin update reviews" on public.reviews
  for update using (public.is_admin());

create policy "users read own claims" on public.claim_requests
  for select using (auth.uid() = user_id or public.is_admin());

create policy "users insert claims" on public.claim_requests
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "admin update claims" on public.claim_requests
  for update using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

create policy "public read post photos"
  on storage.objects for select
  using (bucket_id = 'post-photos');

create policy "auth upload post photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "auth delete own post photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'posts'
  ) then
    execute 'alter publication supabase_realtime add table public.posts';
  end if;
end;
$$;
