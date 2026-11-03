-- Postgres reads "Dish/Spoon" as one file token, so a search for "spoon rest"
-- misses "Ring Dish/Spoon Rest". Fold "/" to a space on the way into search.
-- A name with no slash folds to the same text as before.
--
-- vendor_menus_name_fold_fts_idx and vendor_menus_name_fold_trgm_idx store
-- the output of this function. Rebuild them in this migration so the new
-- tokens are what the indexes return. Do not apply from the app deploy;
-- run as a reviewed migration.

create or replace function public.fold_search_text(input text)
returns text
language sql
immutable
parallel safe
strict
security invoker
set search_path = public, extensions
as $fn$
  select replace(
    extensions.unaccent('extensions.unaccent'::regdictionary, lower(input)),
    '/',
    ' '
  );
$fn$;

reindex index public.vendor_menus_name_fold_fts_idx;
reindex index public.vendor_menus_name_fold_trgm_idx;
