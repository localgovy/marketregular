-- Phone and email stay on the row for admin, but anon and authenticated
-- can no longer select them in bulk. One published listing at a time goes
-- through get_listing_contact.

create or replace function public.get_listing_contact(p_kind text, p_slug text)
returns table (phone text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select contact.phone, contact.email
  from (
    select m.phone, m.email
    from public.markets m
    where p_kind = 'market'
      and m.slug = p_slug
      and m.status = 'published'
    union all
    select v.phone, v.email
    from public.vendors v
    where p_kind = 'vendor'
      and v.slug = p_slug
      and v.status = 'published'
  ) as contact
  limit 1;
$$;

revoke all on function public.get_listing_contact(text, text) from public, anon, authenticated;
grant execute on function public.get_listing_contact(text, text) to anon, authenticated;

revoke select (email, phone) on public.markets from anon, authenticated;
revoke select (email, phone) on public.vendors from anon, authenticated;
