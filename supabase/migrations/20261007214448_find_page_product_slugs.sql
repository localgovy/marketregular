-- Canonical slugs for find pages: varieties and cuts join the page, dishes stay off.
-- Also moves hard cider off apple cider, honeycrisp out of honey, meat pot pies onto meat pies,
-- and honey-garlic sausages and pepperettes onto those pages.
-- Rollback:
--   update public.vendor_menus m
--   set product_slug = b.product_slug,
--       product_category = b.product_category,
--       product_category_source = b.product_category_source
--   from private.find_curation_20261007b b
--   where b.id = m.id
--     and m.product_category_source = 'find_curation_20261007b';

create table if not exists private.find_curation_20261007b (
  id uuid primary key,
  product_slug text,
  product_category text,
  product_category_source text,
  assigned_slug text,
  assigned_category text,
  touch_slug boolean not null
);

revoke all on table private.find_curation_20261007b from public, anon, authenticated;

create or replace function private.find_menu_head_20261007b(lname text, lslug text, forms text)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    lslug ~ ('(^|-)(' || forms || ')$')
    or lname ~ (('(^|[^a-z])(' || forms || ')[[:space:]]*(\\([^)]*\\))?[[:space:]]*$'))
    or lname ~ (('(^|[^a-z])(' || forms || ')[[:space:],]+([[:digit:]]|lb|lbs|kg|oz|pint|bag|bunch|basket|flat|head|bulb)'))
    or (
      lslug ~ ('^(' || forms || ')-')
      and not exists (
        select 1
        from regexp_split_to_table(regexp_replace(lslug, '^(' || forms || ')-', ''), '-') tok
        where tok <> ''
          and tok !~ '^(organic|fresh|local|field|baby|mini|large|lg|small|red|green|yellow|white|purple|golden|black|english|spanish|cooking|sweet|sour|wild|frozen|hot|house|hothouse|vine|roma|cherry|heirloom|bagged|loose|bunch|bunched|bag|box|retail|crown|crowns|floret|florets|whole|sliced|choice|fancy|mixed|pack|ea|oz|lb|lbs|kg|pint|basket|cluster|nantes|boston|iceberg|leaf|button|sungold|beefsteak|beefstake|july|june|aug|sept|august|october|may|ont|que|hydroponic|greenhouse|early|late|x|no|1|2|3|4|5|6|8|12|24|50)$'
      )
    );
$$;

create or replace function private.classify_find_slug_20261007b(
  p_name text,
  p_slug text,
  p_category text,
  p_vendor text,
  p_description text
)
returns table (assigned_slug text, assigned_category text, touch_slug boolean)
language plpgsql
stable
set search_path = public
as $$
declare
  lname text := lower(coalesce(p_name, ''));
  lslug text := lower(coalesce(p_slug, ''));
  lvendor text := lower(coalesce(p_vendor, ''));
  ldesc text := lower(coalesce(p_description, ''));
  norm text := replace(lname, '-', ' ') || ' ' || replace(lslug, '-', ' ');
  produce_bad boolean;
  meat_bad boolean;
  protected text[] := array[
    'bread','sourdough','bagels','croissants','almond-croissant','focaccia','scones','muffins',
    'cookies','chocolate-chip-cookies','pies','apple-pie','pumpkin-pie','butter-tarts','cakes','cheesecake','cupcakes',
    'brownies','cinnamon-buns','donuts','tarts','soups','sandwiches','pizza','meat-pies','quiche','perogies',
    'butter-chicken','jerk-chicken','tomatoes','cherry-tomatoes','heirloom-tomatoes','garlic','carrots','potatoes',
    'peppers','beans','green-beans','beets','cucumbers','onions','green-onions','sweet-corn','corn','squash','zucchini',
    'lettuce','romaine-lettuce','kale','broccoli','spinach','mushrooms','herbs','basil','dill','parsley','rosemary','thyme',
    'asparagus','eggplant','pumpkins','microgreens','broccoli-microgreens','bok-choy','okra','apples','strawberries',
    'raspberries','blueberries','peaches','nectarines','pears','plums','cherries','rhubarb','apricots','blackberries',
    'beef','grass-fed-beef','pork','chicken','free-range-chicken','sausages','breakfast-sausage','summer-sausage','lamb',
    'bacon','peameal-bacon','turkey','pepperettes','seafood','eggs','cheese','honey','comb-honey','honeycomb','creamed-honey',
    'maple-syrup','maple-butter','jams','jellies','pickles','preserves','apple-butter','dried-fruits','coffee','tea','matcha',
    'apple-cider','wine','radishes','arugula','peas','cauliflower','leeks','cabbage','sweet-potatoes','parsnips','turnip',
    'grapes','melons','oranges','pastries','smoothies','burgers','tacos','hot-sauce','lemonade','milk','ice-cream','olive-oil',
    'chutneys','sausage-roll','bee-pollen','apple-fritter'
  ];
  cut boolean;
begin
  if coalesce(p_slug, '') = '' then
    return;
  end if;

  if p_category = 'beverages' and lslug = 'apple-cider' and (
    ldesc ~ '(\d+(\.\d+)?\s*%|\malc\.?\M|alcohol|alc/vol|dry cider|hard cider|vintage|bittersweet|farm cider|estate cider)'
    or lname ~ '(hops cider|flagship cider|blackberry pear|blood orange|cranberry cider|peach cider|pear cider|raspberry lemonade|harvest 20|mix pack)'
    or lvendor ~ '(\mcidery\M|cider company|\mdistillery\M|woodfolk cider|brantview|loch|giessberger|lundy''s cider|brunch beverages|heritage estate)'
  ) then
    return query select null::text, 'alcohol'::text, true;
    return;
  end if;

  if p_category in ('vegetables', 'apples-and-fruit')
     and lname ~ 'cell[[:space:]]*pack|seedling'
     and lslug <> '' then
    return query select null::text, 'plants-and-flowers'::text, true;
    return;
  end if;

  if lslug = any(protected) then
    return;
  end if;

  if (p_category in ('honey', 'apples-and-fruit'))
     and (lname ~ 'honey[[:space:]]*crisp' or lslug ~ 'honey-?crisp') then
    return query select 'apples'::text, 'apples-and-fruit'::text, true;
    return;
  end if;

  if p_category = 'meat-and-turkey' and (lname ~ 'pot[- ]pie' or lslug ~ 'pot-pie') then
    if lname ~ 'chowder' then
      return query select 'soups'::text, 'prepared-foods'::text, true;
    else
      return query select 'meat-pies'::text, 'prepared-foods'::text, true;
    end if;
    return;
  end if;

  if p_category = 'honey' and norm ~ '(^|[^a-z])pepperettes?([^a-z]|$)' then
    return query select 'pepperettes'::text, 'meat-and-turkey'::text, true;
    return;
  end if;

  if p_category = 'honey' and norm ~ '(^|[^a-z])sausages?([^a-z]|$)' then
    return query select 'sausages'::text, 'meat-and-turkey'::text, true;
    return;
  end if;

  produce_bad :=
    lname ~ '["″]'
    or lname ~ '\m\d+\s*inch'
    or norm ~ '(^|[^a-z])(turnovers?|fritters?|fries|crisp|lattice|pies?|tarts?|cakes?|cookies?|muffins?|scones?|donuts?|doughnuts?|soups?|sandwiches?|burgers?|pizzas?|quiches?|parm|parmigiana|bhajis?|rings?|mashed|scalloped|baked|roasted|caramelized|stuffed|creamy|crunchy?|confit|knots?|evoo|sauces?|salsas?|ketchup|jams?|jelly|jellies|pickles?|chutneys?|relish|pastes?|powders?|sundried|sun dried|dried|dehydrated|juices?|ciders?|vinegars?|wines?|oils?|butters?|candy|candies|chocolates?|leathers?|seedlings?|pestos?|hummus|purees?|kits?|energy|refried|cacao|cocoa|crepes?|turkish|bicks|lovers|chompers|sours|crumbles?|chowders?|momos?|products|smoothies?|sodas?|candles?|soaps?|chips?|breads?|cheesy|cell pack|seed pods?|ground cherries|ground cherry|allium)([^a-z]|$)';

  if p_category = 'vegetables' and (lname ~ 'microgreens?' or lslug ~ 'microgreens?') then
    if lname ~ 'broccoli' or lslug ~ 'broccoli' then
      return query select 'broccoli-microgreens'::text, null::text, true;
    else
      return query select 'microgreens'::text, null::text, true;
    end if;
    return;
  end if;

  if p_category = 'vegetables' and not produce_bad
     and (lname ~ 'garlic[[:space:]]+scapes?' or lslug ~ '(^|-)garlic-scapes?$') then
    return query select 'garlic'::text, null::text, true;
    return;
  end if;

  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'radishes|radish') then
    return query select 'radishes'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'arugula') then
    return query select 'arugula'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'peas|pea')
     and norm !~ '(^|[^a-z])(peanut|peach|pear)s?([^a-z]|$)' then
    return query select 'peas'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'cauliflowers|cauliflower') then
    return query select 'cauliflower'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'leeks|leek') then
    return query select 'leeks'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'cabbages|cabbage') then
    return query select 'cabbage'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and (
       private.find_menu_head_20261007b(lname, lslug, 'sweet-potatoes|sweet-potato|sweet potatoes|sweet potato')
       or lname ~ '(^|[^a-z])sweet potatoes?([[:space:]]|$)'
       or lslug ~ 'sweet-potatoes?'
     ) then
    return query select 'sweet-potatoes'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'parsnips|parsnip') then
    return query select 'parsnips'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'turnips|turnip') then
    return query select 'turnip'::text, null::text, true;
    return;
  end if;

  if p_category = 'apples-and-fruit' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'grapes|grape') then
    return query select 'grapes'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad
     and (
       private.find_menu_head_20261007b(lname, lslug, 'watermelons|watermelon|cantaloupes|cantaloupe|honeydews|honeydew|muskmelons|muskmelon|melons|melon')
     ) then
    return query select 'melons'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'oranges|orange') then
    return query select 'oranges'::text, null::text, true;
    return;
  end if;

  if p_category in ('pies-and-sweets', 'bread-and-bakery')
     and (lname ~ 'apple fritters?' or lslug ~ 'apple-fritters?')
     and lname !~ '\mmix\M' then
    return query select 'apple-fritter'::text, null::text, true;
    return;
  end if;

  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])butter tarts?([^a-z]|$)' then
    return query select 'butter-tarts'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])cinnamon buns?([^a-z]|$)' then
    return query select 'cinnamon-buns'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ 'chocolate chip cookies?' and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap)([^a-z]|$)' then
    return query select 'chocolate-chip-cookies'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])brownies?([^a-z]|$)' and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap|mix)([^a-z]|$)' then
    return query select 'brownies'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])cupcakes?([^a-z]|$)' and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap)([^a-z]|$)' then
    return query select 'cupcakes'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])cheesecakes?([^a-z]|$)' and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap)([^a-z]|$)' then
    return query select 'cheesecake'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])(donuts?|doughnuts?)([^a-z]|$)' and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap)([^a-z]|$)' then
    return query select 'donuts'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])cookies?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap|dough|cake|kettle|fudge|mix|kit|liquor)([^a-z]|$)'
     and lname !~ 'cookie butter|chocolate bar' then
    return query select 'cookies'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])tarts?([^a-z]|$)' and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap)([^a-z]|$)' then
    return query select 'tarts'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])cakes?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap|cupcake|cheesecake|pancake|mix|stand|server|fish cakes?|crab cakes?|rice cakes?|kettle|muffins?|funnel)([^a-z]|$)'
     and lname !~ 'cake plate' then
    return query select 'cakes'::text, null::text, true;
    return;
  end if;
  if p_category in ('pies-and-sweets', 'prepared-foods')
     and norm ~ '(^|[^a-z])(meat pies?|pot pies?)([^a-z]|$)'
     and norm ~ '(^|[^a-z])(chicken|beef|turkey|steak|meat)([^a-z]|$)' then
    return query select 'meat-pies'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])pies?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(pizza|crust|filling|shell|pan|whoopie)([^a-z]|$)' then
    return query select 'pies'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])pastr(y|ies)([^a-z]|$)' and norm !~ '(^|[^a-z])(flour|mix)([^a-z]|$)' then
    return query select 'pastries'::text, null::text, true;
    return;
  end if;
  if p_category = 'pies-and-sweets' and norm ~ '(^|[^a-z])ice creams?([^a-z]|$)' and norm !~ '(^|[^a-z])(candle|soap|cake)([^a-z]|$)' then
    return query select 'ice-cream'::text, null::text, true;
    return;
  end if;

  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])butter chicken([^a-z]|$)' then
    return query select 'butter-chicken'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])jerk chicken([^a-z]|$)' then
    return query select 'jerk-chicken'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])sausage rolls?([^a-z]|$)' then
    return query select 'sausage-roll'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])burgers?([^a-z]|$)' then
    return query select 'burgers'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])tacos?([^a-z]|$)' then
    return query select 'tacos'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])pizzas?([^a-z]|$)'
     and lname !~ '(dough|sauce|cutter|stone|peel|oven)[[:space:]]*$'
     and lslug !~ '(dough|sauce|cutter|stone|peel|oven)$' then
    return query select 'pizza'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])quiches?([^a-z]|$)' then
    return query select 'quiche'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])(perogies|perogys|pierogies|pierogi|perogy)([^a-z]|$)' then
    return query select 'perogies'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])soups?([^a-z]|$)'
     and lname !~ '(mix|bones?)[[:space:]]*$'
     and lslug !~ '(mix|bones?)$'
     and lname !~ 'soup hens?' then
    return query select 'soups'::text, null::text, true;
    return;
  end if;
  if p_category = 'prepared-foods' and norm ~ '(^|[^a-z])sandwiches?([^a-z]|$)' then
    return query select 'sandwiches'::text, null::text, true;
    return;
  end if;

  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])sourdoughs?([^a-z]|$)' and norm !~ '(^|[^a-z])(mix|flour|knife|knives)([^a-z]|$)' then
    return query select 'sourdough'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])almond croissants?([^a-z]|$)' then
    return query select 'almond-croissant'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])croissants?([^a-z]|$)' then
    return query select 'croissants'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])bagels?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(mix|chips?|crackers?|seasoning)([^a-z]|$)'
     and lname !~ 'seed mix' then
    return query select 'bagels'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])focaccias?([^a-z]|$)' then
    return query select 'focaccia'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])scones?([^a-z]|$)' then
    return query select 'scones'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery' and norm ~ '(^|[^a-z])muffins?([^a-z]|$)' then
    return query select 'muffins'::text, null::text, true;
    return;
  end if;
  if p_category = 'bread-and-bakery'
     and (
       lslug ~ 'breads?$'
       or lname ~ '(^|[^a-z])breads?[[:space:]]*(\([^)]*\))?[[:space:]]*$'
     )
     and norm !~ '(^|[^a-z])(mix|flour|knife|knives|pudding|crumb|crumbs|crouton|croutons)([^a-z]|$)'
     and lname !~ 'olive oil'
     and lname !~ '(^|[^a-z])bread cheese([^a-z]|$)' then
    return query select 'bread'::text, null::text, true;
    return;
  end if;

  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])hot sauces?([^a-z]|$)' then
    return query select 'hot-sauce'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])olive oils?([^a-z]|$)' then
    return query select 'olive-oil'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])chutneys?([^a-z]|$)' then
    return query select 'chutneys'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])apple butters?([^a-z]|$)' then
    return query select 'apple-butter'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])jell(y|ies)([^a-z]|$)' then
    return query select 'jellies'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])jams?([^a-z]|$)' and norm !~ '(^|[^a-z])macarons?([^a-z]|$)' then
    return query select 'jams'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces' and norm ~ '(^|[^a-z])pickles?([^a-z]|$)' then
    return query select 'pickles'::text, null::text, true;
    return;
  end if;
  if p_category = 'preserves-and-sauces'
     and (lslug ~ 'preserves$' or lname ~ '(^|[^a-z])preserves[[:space:]]*(\([^)]*\))?[[:space:]]*$') then
    return query select 'preserves'::text, null::text, true;
    return;
  end if;
  if p_category = 'nuts-and-snacks'
     and (lslug ~ 'dried-fruits?$' or lname ~ '(^|[^a-z])dried fruits?[[:space:]]*(\([^)]*\))?[[:space:]]*$') then
    return query select 'dried-fruits'::text, null::text, true;
    return;
  end if;

  if p_category = 'beverages' and norm ~ '(^|[^a-z])lemonades?([^a-z]|$)' and norm !~ '(^|[^a-z])(candle|soap|mix)([^a-z]|$)' then
    return query select 'lemonade'::text, null::text, true;
    return;
  end if;
  if p_category = 'beverages' and norm ~ '(^|[^a-z])smoothies?([^a-z]|$)' then
    return query select 'smoothies'::text, null::text, true;
    return;
  end if;

  if p_category = 'honey' and (lname ~ 'bee[[:space:]]*pollen' or lslug ~ 'bee-pollen') then
    return query select 'bee-pollen'::text, null::text, true;
    return;
  end if;
  if p_category = 'honey' and (lname ~ 'honey[[:space:]]*comb|honeycomb|comb[[:space:]]*honey' or lslug ~ 'honey-?comb|comb-honey')
     and norm !~ '(^|[^a-z])(sausage|pepperette|ale|beer|mead|soda|candle|soap)([^a-z]|$)' then
    return query select 'honeycomb'::text, null::text, true;
    return;
  end if;
  if p_category = 'honey'
     and (
       lslug ~ 'honeys?$'
       or lname ~ '(^|[^a-z])honeys?[[:space:]]*(\([^)]*\))?[[:space:]]*$'
       or lname ~ '(^|[^a-z])honeys?[[:space:],]+([[:digit:]]|kg|g|ml|oz|lb|jar|pail|bottle|jug)'
     )
     and norm !~ '(^|[^a-z])(sausages?|pepperettes?|ales?|beers?|meads?|sodas?|granolas?|cashews?|peanuts?|wines?|ciders?|chickens?|dippers?|lollipops?|candy|soaps?|candles?|syrups?|butters?|mustards?|sauces?|popcorn|chocolates?|hams?|salmons?|nuts?)([^a-z]|$)' then
    return query select 'honey'::text, null::text, true;
    return;
  end if;

  if p_category = 'maple' and norm ~ '(^|[^a-z])maple butters?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(cookie|candy|fudge|taffy|pie|tart)([^a-z]|$)' then
    return query select 'maple-butter'::text, null::text, true;
    return;
  end if;
  if p_category = 'maple' and norm ~ '(^|[^a-z])maple syrups?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(cookies?|candy|candies|sausages?|fudge|taffy|popcorn|ales?|beers?|donuts?|doughnuts?|lattes?|coffees?|mustards?|hams?|salmons?|chickens?|pies?|tarts?|candles?|soaps?)([^a-z]|$)' then
    return query select 'maple-syrup'::text, null::text, true;
    return;
  end if;

  if p_category = 'cheese-and-dairy'
     and (lslug ~ 'milks?$' or lname ~ '(^|[^a-z])milks?[[:space:]]*(\([^)]*\))?[[:space:]]*$')
     and lname !~ 'buttermilk|almond|oat milk|soy|coconut milk|cashew' then
    return query select 'milk'::text, null::text, true;
    return;
  end if;
  if p_category = 'cheese-and-dairy'
     and (
       lslug ~ 'cheeses?$'
       or lslug ~ 'cheese-curds?$'
       or lname ~ '(^|[^a-z])cheeses?[[:space:]]*(\([^)]*\))?[[:space:]]*$'
       or lname ~ '(^|[^a-z])cheese curds?([[:space:]]|$)'
     )
     and norm !~ '(^|[^a-z])(cakes?|grilled|sandwiches?|breads?|macaroni|popcorn|kettle|chocolates?|curls?|snacks?|pies?|momos?|parathas?|manaeesh|burgers?|doritos|maize|stuffed|trays?|dips?|perogies|pierogies|croissants?|bagels?|candies?|cookies?)([^a-z]|$)'
     and lname !~ 'head cheese' then
    return query select 'cheese'::text, null::text, true;
    return;
  end if;

  if p_category = 'eggs'
     and (lslug ~ 'eggs?$' or lname ~ '(^|[^a-z])eggs?[[:space:]]*(\([^)]*\))?[[:space:]]*$')
     and norm !~ '(^|[^a-z])(salads?|sandwiches?|noodles?|nogs?|rolls?|benedicts?|omelets?|omelettes?|scrambles?|fried|quiches?|mayo|mayos?|plants?|eggplants?|bites?|buns?)([^a-z]|$)' then
    return query select 'eggs'::text, null::text, true;
    return;
  end if;

  if p_category = 'coffee-and-tea' and (lslug ~ 'matchas?$' or lname ~ '(^|[^a-z])matchas?[[:space:]]*(\([^)]*\))?[[:space:]]*$')
     and norm !~ '(^|[^a-z])(ice cream|gelato|candle|soap|latte cake)([^a-z]|$)' then
    return query select 'matcha'::text, null::text, true;
    return;
  end if;
  if p_category = 'coffee-and-tea'
     and (
       lslug ~ 'teas?$'
       or lname ~ '(^|[^a-z])teas?[[:space:]]*(\([^)]*\))?[[:space:]]*$'
     )
     and norm !~ '(^|[^a-z])(towels?|trees?|eggs?|candles?|soaps?|beef|cakes?|cookies?|infusers?|cozies|cozy)([^a-z]|$)' then
    return query select 'tea'::text, null::text, true;
    return;
  end if;
  if p_category = 'coffee-and-tea'
     and (
       lslug ~ 'coffees?$'
       or lslug ~ 'coffee-beans?$'
       or lname ~ '(^|[^a-z])coffees?[[:space:]]*(\([^)]*\))?[[:space:]]*$'
       or lname ~ '(^|[^a-z])coffee beans?([[:space:]]|$)'
     )
     and norm !~ '(^|[^a-z])(cakes?|rubs?|soaps?|candles?|candy|cookies?|ice cream|gelato)([^a-z]|$)' then
    return query select 'coffee'::text, null::text, true;
    return;
  end if;

  if p_category = 'vegetables' and not produce_bad and (lname ~ '(^|[^a-z])(cherry tomatoes|cherry tomato)([^a-z]|$)' or lslug ~ 'cherry-tomatoes?') then
    return query select 'cherry-tomatoes'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and (lname ~ 'heirloom tomatoes?' or lslug ~ 'heirloom-tomatoes?') then
    return query select 'heirloom-tomatoes'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'tomatoes|tomato') then
    return query select 'tomatoes'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'garlics|garlic')
     and not (lname ~ '(^|[^a-z])(rosemary|thyme|basil|parsley|oregano|dill)([^a-z]|$)' and lname !~ 'scape|bulb|clove') then
    return query select 'garlic'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'carrots|carrot') then
    return query select 'carrots'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'potatoes|potato')
     and lname !~ 'sweet' and lslug !~ 'sweet' then
    return query select 'potatoes'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'peppers|pepper') then
    return query select 'peppers'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and (
       private.find_menu_head_20261007b(lname, lslug, 'green-beans|green beans')
       or (private.find_menu_head_20261007b(lname, lslug, 'beans|bean') and lslug ~ 'green-beans?' and lname !~ 'yellow')
     ) then
    return query select 'green-beans'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'beans|bean') then
    return query select 'beans'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'beets|beet') then
    return query select 'beets'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'cucumbers|cucumber') then
    return query select 'cucumbers'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and (
       private.find_menu_head_20261007b(lname, lslug, 'green-onions|green onions|scallions|scallion')
       or lname ~ 'bunching onions?'
       or lslug ~ 'green-onions?'
     ) then
    return query select 'green-onions'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'onions|onion') then
    return query select 'onions'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and (lname ~ '(^|[^a-z])sweet corn([^a-z]|$)' or lslug ~ '(^|-)sweet-corns?$' or lslug ~ '^sweet-corns?-') then
    return query select 'sweet-corn'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'corns|corn')
     and norm !~ '(^|[^a-z])(popcorn|cornbread|cornmeal|tortillas?|chips?)([^a-z]|$)' then
    return query select 'corn'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'squash|squashes') then
    return query select 'squash'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'zucchinis|zucchini') then
    return query select 'zucchini'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and (lname ~ 'romaine' or lslug ~ 'romaine')
     and private.find_menu_head_20261007b(lname, lslug, 'lettuces|lettuce|romaine') then
    return query select 'romaine-lettuce'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'lettuces|lettuce') then
    return query select 'lettuce'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'kales|kale') then
    return query select 'kale'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'broccoli') then
    return query select 'broccoli'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'spinaches|spinach') then
    return query select 'spinach'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad
     and private.find_menu_head_20261007b(lname, lslug, 'mushrooms|mushroom') then
    return query select 'mushrooms'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'basils|basil') then
    return query select 'basil'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'dills|dill') then
    return query select 'dill'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'parsleys|parsley') then
    return query select 'parsley'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'rosemary') then
    return query select 'rosemary'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'thymes|thyme') then
    return query select 'thyme'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'herbs|herb') then
    return query select 'herbs'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'asparagus') then
    return query select 'asparagus'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'eggplants|eggplant') then
    return query select 'eggplant'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'pumpkins|pumpkin') then
    return query select 'pumpkins'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'bok-choy|bok choy|bok-choys|bok choys') then
    return query select 'bok-choy'::text, null::text, true;
    return;
  end if;
  if p_category = 'vegetables' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'okra') then
    return query select 'okra'::text, null::text, true;
    return;
  end if;

  if p_category = 'apples-and-fruit' and not produce_bad
     and lname !~ 'pineapple' and lslug !~ 'pineapple'
     and private.find_menu_head_20261007b(lname, lslug, 'apples|apple') then
    return query select 'apples'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'strawberries|strawberry') then
    return query select 'strawberries'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'raspberries|raspberry') then
    return query select 'raspberries'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'blueberries|blueberry') then
    return query select 'blueberries'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'nectarines|nectarine') then
    return query select 'nectarines'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'peaches|peach') then
    return query select 'peaches'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'pears|pear') then
    return query select 'pears'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'plums|plum') then
    return query select 'plums'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad
     and lname !~ 'ground[[:space:]]+cherr' and lslug !~ 'ground-cherr'
     and private.find_menu_head_20261007b(lname, lslug, 'cherries|cherry') then
    return query select 'cherries'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'rhubarbs|rhubarb') then
    return query select 'rhubarb'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'apricots|apricot') then
    return query select 'apricots'::text, null::text, true;
    return;
  end if;
  if p_category = 'apples-and-fruit' and not produce_bad and private.find_menu_head_20261007b(lname, lslug, 'blackberries|blackberry') then
    return query select 'blackberries'::text, null::text, true;
    return;
  end if;

  if p_category = 'meat-and-turkey' and norm ~ '(^|[^a-z])pepperettes?([^a-z]|$)' then
    return query select 'pepperettes'::text, null::text, true;
    return;
  end if;
  if p_category = 'meat-and-turkey' and norm ~ '(^|[^a-z])sausage rolls?([^a-z]|$)' then
    return query select 'sausage-roll'::text, null::text, true;
    return;
  end if;
  if p_category = 'meat-and-turkey' and norm ~ '(^|[^a-z])sausages?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(pepperettes?|grav(?:y|ies)|rolls?|sandwiches?|pizzas?|muffins?|biscuits?|wraps?|breads?|battered)([^a-z]|$)'
     and lname !~ ' and (chips|mash|fries)' then
    if norm ~ '(^|[^a-z])breakfast([^a-z]|$)' then
      return query select 'breakfast-sausage'::text, null::text, true;
    elsif norm ~ '(^|[^a-z])summer sausage([^a-z]|$)' then
      return query select 'summer-sausage'::text, null::text, true;
    else
      return query select 'sausages'::text, null::text, true;
    end if;
    return;
  end if;
  if p_category = 'meat-and-turkey'
     and (lslug ~ 'bacons?$' or lname ~ '(^|[^a-z])bacons?[[:space:]]*(\([^)]*\))?[[:space:]]*$')
     and norm !~ '(^|[^a-z])(fakin|fake|vegan|vegetarian|pepperettes?|sausages?|peameal|jerky)([^a-z]|$)'
     and lname !~ '^add '
     and lname !~ ' and '
     and lname !~ 'cheesy' then
    return query select 'bacon'::text, null::text, true;
    return;
  end if;

  meat_bad := norm ~ '(^|[^a-z])(sausages?|pepperettes?|wieners?|hot dogs?|hotdogs?|salamis?|pepperonis?|jerkys?|pies?|pasties|momos?|biryanis?|schnitzels?|enchiladas?|fajitas?|stroganoff|bourguignon|vindaloo|madras|bulgogi|tibs|doners?|kebabs?|kabobs?|salads?|sandwiches?|burgers?|pizzas?|soups?|bouillons?|boullions?|broths?|grav(?:y|ies)|stocks?|powders?|tandoori|tikkas?|katsu|buffalo|breaded|fried|grilled|barbeque|barbecue|bbq|smoked|marinated|curr(?:y|ied)|chilis?|chillies|gozleme|parathas?|stuffed|crostini|buffets?|menus?|beyond|impossible|hoofs?|hooves|tracheas?|tendons?|patellas?|lungs?|knuckles?|chews?|treats?|nuggets?|kiev|cordon|meatballs?|meatloafs?|meatloaves|patt(?:y|ies)|sliders?|wraps?|shawarmas?|gyros?|souvlaki|skewers?|satays?|teriyaki|stir fry|flaked|canned|dogs?|pets?|dehydrated|cooked|dusted|crispy|popcorn|roasted|candied|mongolian|montreal|cashews?|tao|chou|dozen|spicy|wood fired|generals?|fakin|fake|vegan|deli|cold cuts?|licious)([^a-z]|$)';
  cut := norm ~ '(^|[^a-z])(breasts?|thighs?|wings?|drumsticks?|legs?|livers?|hearts?|tongues?|ribs?|briskets?|tenderloins?|sirloins?|flanks?|skirts?|chucks?|shanks?|oxtails?|ox tails?|bones?|marrows?|steaks?|roasts?|ground|stewing|cutlets?|gizzards?|hocks?|shoulders?|chops?|racks?|loins?|filets?|fillets?|tomahawks?|ribeyes?|striploins?|bell(?:y|ies)|rounds?|rumps?|cheeks?|kidneys?|tripes?|suets?|tallows?|necks?|feet|foot)([^a-z]|$)';

  if p_category = 'meat-and-turkey' and not meat_bad
     and lname !~ 'butter chicken|jerk chicken'
     and (
       (norm ~ '(^|[^a-z])chickens?([^a-z]|$)'::text and norm !~ '(^|[^a-z])(beef|pork|lambs?|turkeys?)([^a-z]|$)')
     )
     and (
       cut
       or (lslug ~ 'chickens?$' and lname ~ '(^|[^a-z])chickens?([[:space:]]*\([^)]*\))?[[:space:]]*$')
     ) then
    return query select 'chicken'::text, null::text, true;
    return;
  end if;
  if p_category = 'meat-and-turkey' and not meat_bad
     and norm ~ '(^|[^a-z])beef([^a-z]|$)'
     and norm !~ '(^|[^a-z])(chickens?|pork|lambs?|turkeys?)([^a-z]|$)'
     and (
       cut
       or (lslug ~ 'beef$' and lname ~ '(^|[^a-z])beef([[:space:]]*\([^)]*\))?[[:space:]]*$')
     ) then
    return query select 'beef'::text, null::text, true;
    return;
  end if;
  if p_category = 'meat-and-turkey' and not meat_bad
     and norm ~ '(^|[^a-z])pork([^a-z]|$)'
     and norm !~ '(^|[^a-z])(chickens?|beef|lambs?|turkeys?)([^a-z]|$)'
     and (
       cut
       or (lslug ~ 'pork$' and lname ~ '(^|[^a-z])pork([[:space:]]*\([^)]*\))?[[:space:]]*$')
     ) then
    return query select 'pork'::text, null::text, true;
    return;
  end if;
  if p_category = 'meat-and-turkey' and not meat_bad
     and norm ~ '(^|[^a-z])lambs?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(chickens?|beef|pork|turkeys?)([^a-z]|$)'
     and (
       cut
       or (lslug ~ 'lambs?$' and lname ~ '(^|[^a-z])lambs?([[:space:]]*\([^)]*\))?[[:space:]]*$')
     ) then
    return query select 'lamb'::text, null::text, true;
    return;
  end if;
  if p_category = 'meat-and-turkey' and not meat_bad
     and norm ~ '(^|[^a-z])turkeys?([^a-z]|$)'
     and norm !~ '(^|[^a-z])(chickens?|beef|pork|lambs?)([^a-z]|$)'
     and (
       cut
       or (lslug ~ 'turkeys?$' and lname ~ '(^|[^a-z])turkeys?([[:space:]]*\([^)]*\))?[[:space:]]*$')
     ) then
    return query select 'turkey'::text, null::text, true;
    return;
  end if;

  return;
end;
$$;

insert into private.find_curation_20261007b (
  id, product_slug, product_category, product_category_source, assigned_slug, assigned_category, touch_slug
)
select
  vm.id,
  vm.product_slug,
  vm.product_category,
  vm.product_category_source,
  c.assigned_slug,
  c.assigned_category,
  c.touch_slug
from public.vendor_menus vm
join public.vendors v on v.id = vm.vendor_id
cross join lateral private.classify_find_slug_20261007b(
  vm.name, vm.product_slug, vm.product_category, v.name, vm.description
) c
where c.touch_slug
  and (
    vm.product_slug is distinct from c.assigned_slug
    or vm.product_category is distinct from coalesce(c.assigned_category, vm.product_category)
  )
on conflict (id) do nothing;

update public.vendor_menus vm
set
  product_slug = case when b.touch_slug then b.assigned_slug else vm.product_slug end,
  product_category = coalesce(b.assigned_category, vm.product_category),
  product_category_source = 'find_curation_20261007b'
from private.find_curation_20261007b b
where vm.id = b.id
  and (
    vm.product_slug is distinct from case when b.touch_slug then b.assigned_slug else vm.product_slug end
    or vm.product_category is distinct from coalesce(b.assigned_category, vm.product_category)
  );

drop function if exists private.classify_find_slug_20261007b(text, text, text, text, text);
drop function if exists private.find_menu_head_20261007b(text, text, text);

-- Soup hens are birds, and battered sausage with chips is a plate. Put those slugs back.
update public.vendor_menus m
set
  product_slug = b.product_slug,
  product_category = b.product_category,
  product_category_source = b.product_category_source
from private.find_curation_20261007b b
where b.id = m.id
  and (
    m.name ~* 'soup hens?'
    or m.name ~* 'battered sausage'
    or (m.product_slug = 'sausages' and m.name ~* ' and (chips|mash|fries)')
  );

-- Bare brisket, ribeye, striploin, sirloin and T-bone in the meat category are beef cuts.
insert into private.find_curation_20261007b (
  id, product_slug, product_category, product_category_source, assigned_slug, assigned_category, touch_slug
)
select
  vm.id,
  vm.product_slug,
  vm.product_category,
  vm.product_category_source,
  'beef',
  null,
  true
from public.vendor_menus vm
where vm.product_category = 'meat-and-turkey'
  and vm.name !~* 'pork|chicken|lamb|turkey|sausage|pepperette|pie|burger|sandwich|jerky|guinness'
  and (
    vm.name ~* '(^|[^a-z])(briskets?|ribeyes?|striploins?|sirloins?|t-bones?|tomahawks?|steaks?)([^a-z]|$)'
    or coalesce(vm.product_slug, '') ~ '(^|-)(brisket|ribeye|striploin|sirloin|t-bone|tomahawk|steaks?)($|-)'
  )
  and coalesce(vm.product_slug, '') is distinct from 'beef'
on conflict (id) do nothing;

update public.vendor_menus vm
set
  product_slug = 'beef',
  product_category_source = 'find_curation_20261007b'
from private.find_curation_20261007b b
where vm.id = b.id
  and b.assigned_slug = 'beef'
  and vm.product_slug is distinct from 'beef'
  and vm.product_category = 'meat-and-turkey'
  and vm.name !~* 'guinness';

update public.vendor_menus m
set
  product_slug = b.product_slug,
  product_category_source = b.product_category_source
from private.find_curation_20261007b b
where b.id = m.id
  and m.name ~* 'steak (&|and) guinness';
