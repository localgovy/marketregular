-- Stall overrides can charge any flat fee from 0 to 10000 cents.
-- The ledger used to allow only 0 or 25, so any other flat was dropped.

do $$
declare
  name text;
begin
  for name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'platform_fees'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%flat_cents%'
  loop
    execute format('alter table public.platform_fees drop constraint %I', name);
  end loop;
end $$;

alter table public.platform_fees
  add constraint platform_fees_flat_cents_check
    check (flat_cents between 0 and 10000);
