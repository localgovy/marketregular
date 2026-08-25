-- Stamp onboarded_at for people who already finished the desk or who
-- signed up before the wizard existed, so the proxy does not send them
-- to /onboarding from every page. Brand-new empty profiles stay null.

update public.profiles
set onboarded_at = coalesce(onboarded_at, created_at, now())
where onboarded_at is null
  and username is not null;

update public.profiles
set onboarded_at = coalesce(created_at, now())
where onboarded_at is null
  and created_at < timestamptz '2026-08-24 19:53:34+00';

-- If handle_new_user missed the row, Finish can insert the caller's profile.
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id and role = 'user');
