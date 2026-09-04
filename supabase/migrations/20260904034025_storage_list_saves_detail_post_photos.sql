-- Public buckets still serve known URLs. Stop directory listing of every object.

drop policy if exists "public read post photos" on storage.objects;
drop policy if exists "public read listing marks" on storage.objects;

create policy "auth read own post photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pin floor-note photos to this project's storage host.
create or replace function public.guard_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  photo text;
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id := auth.uid();
    new.verified_on_site := false;
    new.flagged := false;
    new.created_at := now();
    if not exists (
      select 1 from public.markets
      where id = new.market_id and status = 'published'
    ) then
      raise exception 'That listing is missing' using errcode = 'P0001';
    end if;
    if coalesce(cardinality(new.photos), 0) > 8 then
      raise exception 'Too many photos' using errcode = 'P0001';
    end if;
    if new.photos is not null then
      foreach photo in array new.photos
      loop
        if photo is null
          or char_length(photo) > 2048
          or photo ~ '\.\.|\\|#'
          or photo !~* (
            '^https://pxsndrlptceafhsxfays\.supabase\.co/storage/v1/object/public/post-photos/'
            || new.user_id::text
            || '/'
          )
        then
          raise exception 'Photo URL is not allowed' using errcode = 'P0001';
        end if;
      end loop;
    end if;
    if exists (
      select 1
      from public.posts p
      where p.user_id = new.user_id
        and p.flagged = true
        and md5(lower(trim(p.body))) = md5(lower(trim(new.body)))
        and p.created_at >= now() - interval '90 days'
    ) then
      raise exception 'This post was removed' using errcode = 'P0001';
    end if;
    if (
      select count(*) from public.posts
      where user_id = new.user_id
        and created_at >= now() - interval '24 hours'
    ) >= 10 then
      raise exception 'Daily review limit reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_post_insert() from public, anon, authenticated;

alter table public.saves
  drop constraint if exists saves_detail_size_check;

alter table public.saves
  add constraint saves_detail_size_check
  check (
    detail is null
    or (
      jsonb_typeof(detail) = 'object'
      and octet_length(detail::text) <= 4096
    )
  );
