-- Desk listing logos go in via the service role (admin.ts), not JWT is_admin().
-- Drop leftover authenticated write policies on listing-marks.
drop policy if exists "admin insert listing marks" on storage.objects;
drop policy if exists "admin update listing marks" on storage.objects;
drop policy if exists "admin delete listing marks" on storage.objects;
