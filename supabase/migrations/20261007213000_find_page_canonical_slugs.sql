-- Canonical slugs for the curated find pages: sourdough, wine, apple cider, seafood.
-- Updates product_slug only, on rows that already have the matching food category.
-- Rollback:
--   update public.vendor_menus m
--   set product_slug = b.product_slug,
--       product_category_source = b.product_category_source
--   from private.find_curation_20261007 b
--   where b.id = m.id
--     and m.product_category_source = 'find_curation_20261007';

create table if not exists private.find_curation_20261007 (
  id uuid primary key,
  product_slug text,
  product_category_source text,
  assigned_slug text not null
);

revoke all on table private.find_curation_20261007 from public, anon, authenticated;

with candidates as (
  select
    vm.id,
    vm.product_slug,
    vm.product_category_source,
    case
      when vm.product_category = 'bread-and-bakery'
        and (
          vm.name ~* 'sourdough'
          or coalesce(vm.product_slug, '') ~ 'sourdough'
        )
        then 'sourdough'
      when vm.product_category = 'beverages'
        and (
          coalesce(vm.product_slug, '') ~ 'cider'
          or vm.name ~* 'cider'
        )
        and vm.name !~* 'fire cider|freezie|vinegar'
        and coalesce(vm.product_slug, '') !~ 'fire-cider|freezie|vinegar'
        then 'apple-cider'
      when vm.product_category = 'seafood'
        and vm.name !~* 'chips|chowder|gumbo|buffet|coleslaw|crab apple|tuber|breaded chicken|crab mayo'
        and coalesce(vm.product_slug, '') !~ 'chips|chowder|gumbo|buffet|coleslaw|crab-apple|tuber|breaded-chicken|crab-mayo'
        then 'seafood'
      when vm.product_category = 'alcohol'
        and not (
          coalesce(vm.product_slug, '') ~ '(ale|beer|lager|ipa|stout|pilsner|porter|whisky|whiskey|gin|vodka|rum|mead|cider|bourbon|tequila|brandy|cognac|sake|cooler|seltzer|moonshine|bitters|vermouth|martini|saison|gose|festbier|philsner)'
          or vm.name ~* '\m(ales?|beers?|lagers?|ipas?|stouts?|pilsners?|porters?|whisk(e)?y|gins?|vodkas?|rums?|meads?|ciders?|bourbons?|tequilas?|brand(y|ies)|cognacs?|sakes?|coolers?|seltzers?|moonshines?|bitters|vermouths?|martinis?|saisons?|goses?|festbiers?|m[aä]rzens?|philsners?|\mesb\M|\mxpa\M|\mapa\M)\M'
          or coalesce(vm.product_slug, '') ~ 'maple-syrup'
          or vm.name ~* 'maple syrup'
          or vm.name ~* '\mrye\M'
        )
        and (
          coalesce(vm.product_slug, '') ~ '(wine|riesling|chardonnay|pinot|gamay|sauvignon|merlot|cabernet|icewine|rose|vidal|baco|grigio|gewurz|shiraz|syrah|malbec|viognier|chenin|muscat|moscato|zinfandel|tempranillo|sangiovese|brut|cuvee|bordeaux|vqa|sangria|falanghina|champagne|prosecco)'
          or vm.name ~* '\m(wines?|riesling|chardonnay|pinots?|gamay|sauvignon|merlot|cabernet|ice\s*wines?|icewine|ros[eé]s?|vidal|baco|grigio|gewürz|gewurz|shiraz|syrah|malbec|viognier|chenin|muscats?|moscato|zinfandel|tempranillo|sangiovese|bruts?|cuv[eé]es?|bordeaux|burgundy|beaujolais|champagne|prosecco|cava|sangrias?|falanghina)\M'
          or vm.name ~* '\mVQA\M'
        )
        then 'wine'
    end as assigned_slug
  from public.vendor_menus vm
)
insert into private.find_curation_20261007 (id, product_slug, product_category_source, assigned_slug)
select id, product_slug, product_category_source, assigned_slug
from candidates
where assigned_slug is not null
  and product_slug is distinct from assigned_slug
on conflict (id) do nothing;

update public.vendor_menus vm
set
  product_slug = b.assigned_slug,
  product_category_source = 'find_curation_20261007'
from private.find_curation_20261007 b
where vm.id = b.id
  and vm.product_slug is distinct from b.assigned_slug;
