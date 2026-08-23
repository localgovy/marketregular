-- Keep the homepage census in step with the directory, not only the nightly cron.
create function private.touch_directory_census()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.refresh_directory_census();
  return null;
end;
$$;

revoke all on function private.touch_directory_census() from public;

create trigger directory_census_on_vendors
after insert or update or delete or truncate on public.vendors
for each statement
execute function private.touch_directory_census();

create trigger directory_census_on_markets
after insert or update or delete or truncate on public.markets
for each statement
execute function private.touch_directory_census();

create trigger directory_census_on_market_vendors
after insert or update or delete or truncate on public.market_vendors
for each statement
execute function private.touch_directory_census();

select private.refresh_directory_census();
