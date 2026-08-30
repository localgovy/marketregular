-- Kids-class booth imported as a stall. Drafted with the other Stouffville
-- service listings; now remove the row so its three class prices are not
-- sitting in vendor_menus outside the public census.
--
-- Menus, hall links, and reviews cascade. Saves are keyed by slug.

delete from public.saves
where kind = 'vendor' and slug = 'kidz-klubhouse';

delete from public.claim_requests
where target_type = 'vendor'
  and target_id = (select id from public.vendors where slug = 'kidz-klubhouse');

delete from public.vendors
where slug = 'kidz-klubhouse';

select private.refresh_directory_census();
