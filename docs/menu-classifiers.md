# Menu classifiers

Product search joins two lists you curate. A general term points at classifiers. A menu item carries classifiers. Search returns items that have them, including listings that never use the shopper's word.

The function does not name a food. Adding `picnic` is rows, not a deploy.

`product_category`, `product_slug`, `menu_section`, and `dietary` stay as they are. Do not update them from this workflow.

Service role only. These tables are not on the public API.

## Tables

`menu_classifiers` — one allowed value. `slug` is `facet.value`.

| Facet | What it means |
| --- | --- |
| `kind` | The thing. Food (`kind.cookies`, `kind.red-wine`) and goods (`kind.earrings`, `kind.houseplants`). Find-page slugs are already here. Add a value when search needs a name the find pages do not cover. |
| `use` | The job: `dessert`, `pastry`, `snack`, `side`, `main`, `appetizer`, `condiment`, `drink`, `baking`, `picnic`, `bbq`, `charcuterie`, `preserve`, `produce`, `gift`. |
| `occasion` | `thanksgiving`, `christmas`, `easter`, `halloween`, `holiday`. |
| `meal` | `breakfast`, `brunch`, `lunch`, `dinner`. |
| `ingredient` | `pumpkin`, `apple`, `chocolate`, `cranberry`, and new ones you add. |
| `diet` | `organic`, `gluten-free`, `vegan`, `vegetarian`, `dairy-free`, `halal`, `keto`. |
| `origin` | Cuisine or place: `indian`, `mexican`, `jamaican`, `caribbean`, `italian`, `chinese`, `korean`, `japanese`, `thai`, `vietnamese`, `filipino`, `middle-eastern`, `lebanese`, `greek`, `ethiopian`, `ukrainian`, `polish`, `portuguese`, `latin-american`, `ontario`, `quebec`, `niagara`, `local`. |
| `material` | `sterling-silver`, `gold`, `gemstone`, `pearl`, `beeswax`, `soy-wax`, `cotton`, `linen`, `wool`, `alpaca`, `leather`, `ceramic`, `glass`, `wood`, `bamboo`, `resin`. |
| `audience` | `women`, `men`, `kids`, `baby`, `pets`, `unisex`. |
| `format` | `frozen`, `ready-to-eat`, `heat-and-serve`, `bulk`, `gift-set`, `sampler`, `single`, `dozen`, `pack`, `refill`, `subscription`. |
| `production` | `wild`, `foraged`, `pasture-raised`, `grass-fed`, `free-range`, `small-batch`, `handmade`, `organic`, `fair-trade`, `zero-waste`. `production.organic` is separate from `diet.organic`; do not move existing diet rows. |
| `style` | `hazy`, `barrel-aged`, `dry`, `sweet`, `vqa`, `light-roast`, `medium-roast`, `dark-roast`, `aged`. |

Facets are fixed. Insert a value under one of them. A new facet needs a migration.

`search_terms` — the phrase a shopper types, lowercase, single spaces. `desserts` and `sweets` are their own rows. There is no stemmer. If the typed word or phrase is not a term, `search_query_parts` tries `s`, `es`, and `ies`→`y` (and the reverse) before treating it as a leftover word. Do not add `sweet` on its own. `sweet corn` must stay a whole term so it does not split.

`search_term_classifiers` — `(term, classifier_slug, weight)`.

- **3** — this classifier is what they asked for. `cookies` → `kind.cookies`. `dessert` → `use.dessert`. `red wine` → `kind.red-wine`.
- **2** — a defining member. `dessert` → `kind.cookies`. `thanksgiving` → `kind.turkey`.
- **1** — related, still retrieved, ranked lower.

`vendor_menu_classifier_assignments` — one row per classifier on an item. `source` is your run id, 1–80 characters.

`vendor_menu_classifier_reviews` — one row once you have judged the item. Zero assignment rows is a real decision. `basis` is:

```text
lower(btrim(name)) || '|' || left(coalesce(btrim(description), ''), 160)
```

## How a query matches

1. If the whole query is a term (or a singular/plural variant of a term), use that term only.
2. Otherwise walk left to right and take the longest phrase that is a term, including those variants. `thanksgiving dessert` is those two terms. `chocolate chip cookies` is one term. `earring` becomes `earrings` when that is the stored term.
3. The item must satisfy every term. Terms AND. Classifiers on one term OR.
4. A word that is not part of a term must appear in the item name. `chocolate dessert` is the dessert set, narrowed to names that say chocolate, until you add a `chocolate` term.
5. If nothing is a term, search stays on the item name, the old synonym list, and the trigram.

When the query has terms, a weight-3 classifier match ranks first (1000), then a name that contains the query (300), then an exact product slug (100), then classifier weight. That is why `red wine` ranks tagged red wines above Red Wine Vinegar and wine glasses. Queries with no term still put a name hit first.

A classified item can match whatever its `product_category` is, including null and the older craft buckets. Pet-food rows still need a pet word in the query (`dog`, `cat`, `pet`, `puppy`, `kitten`, `chew`, `kibble`, and their plurals).

The old `product_synonyms` list is not copied here. `sourdough` there still points at bread. Do not recreate that kind of link.

## Queue

Published items with no review, or a stale basis. Limit 200.

```sql
select
  vm.id,
  vm.name,
  vm.description,
  vm.product_category,
  vm.product_slug,
  v.name as vendor_name,
  coalesce(array_agg(a.classifier_slug order by a.classifier_slug) filter (where a.classifier_slug is not null), '{}') as classifiers
from public.vendor_menus vm
join public.vendors v
  on v.id = vm.vendor_id
 and v.status = 'published'
left join public.vendor_menu_classifier_reviews r
  on r.menu_id = vm.id
left join public.vendor_menu_classifier_assignments a
  on a.menu_id = vm.id
where r.menu_id is null
   or r.basis is distinct from lower(btrim(vm.name)) || '|' || left(coalesce(btrim(vm.description), ''), 160)
group by vm.id, vm.name, vm.description, vm.product_category, vm.product_slug, v.name
order by vm.id
limit 200;
```

Items already carry `kind.*` where `product_slug` is a find-page slug, and `diet.*` copied from `dietary`. Those rows use source `slug_bootstrap` and `diet_bootstrap`. They are still in this queue.

A later tagging run stored goods and extra food kinds with source `taxo_20261015_0905`. When the seeder re-judges an item (its basis changed), **keep those tags**. Delete only assignments that are not from that run, then insert your new rows. Do not write the bootstrap source back on top.

## Writes

Add a classifier:

```sql
insert into public.menu_classifiers (slug, facet, value, label)
values ('kind.stuffing', 'kind', 'stuffing', 'Stuffing');
```

`slug` must equal `facet || '.' || value`. `value` is lowercase words separated by single hyphens.

Add or replace a term. Delete the old links first when the meaning changes.

```sql
insert into public.search_terms (term, label, source)
values ('picnic', 'Picnic', 'grok_run_id')
on conflict (term) do update
set label = excluded.label,
    source = excluded.source;

delete from public.search_term_classifiers where term = 'picnic';

insert into public.search_term_classifiers (term, classifier_slug, weight) values
  ('picnic', 'use.picnic', 3),
  ('picnic', 'kind.sandwiches', 2);
```

Replace one item, but keep `taxo_20261015_0905` tags:

```sql
delete from public.vendor_menu_classifier_assignments
where menu_id = :id
  and source is distinct from 'taxo_20261015_0905';

insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug, source)
values
  (:id, 'kind.pumpkin-pie', :source),
  (:id, 'use.dessert', :source),
  (:id, 'occasion.thanksgiving', :source)
on conflict (menu_id, classifier_slug) do update
set source = excluded.source
where vendor_menu_classifier_assignments.source is distinct from 'taxo_20261015_0905';

insert into public.vendor_menu_classifier_reviews (menu_id, source, basis)
values (
  :id,
  :source,
  lower(btrim(:name)) || '|' || left(coalesce(btrim(:description), ''), 160)
)
on conflict (menu_id) do update
set source = excluded.source,
    basis = excluded.basis,
    tagged_at = now();
```

If a delete without that source filter already dropped the taxo rows, re-insert them from the previous assignment list before you upsert the review.

When nothing applies, still keep the taxo rows, skip your own inserts, and upsert the review.

## Judgment

- A cinnamon bun is pastry and dessert.
- A plain croissant is pastry only. A chocolate croissant is pastry and dessert.
- A steak pie is a main, not a dessert.
- A turkey sandwich is not thanksgiving.
- Thanksgiving is the meal: turkey, pumpkin, pumpkin or apple or pecan pie, squash, sweet potato, cranberry, stuffing, gravy, brussels sprouts, potatoes, green beans, corn, dinner rolls, apple cider. Not every vegetable.
- Christmas can overlap thanksgiving. Ham, tourtière, shortbread, gingerbread, eggnog, and fruitcake belong there when the listing is that food.
- A cookie is neither a side nor a main.
- Empty classifiers are allowed.
- `kind` now covers goods as well as food. Earrings, houseplants, gift cards, and repairs are kinds, not a separate goods facet.
- Do not tag pet food as people food. Pet treats stay `product_category = pet-food`. Pet accessories (toys, beds, bandanas, leashes, mats) belong in `pet-food` alongside pet food, so they stay out of people searches.
- Baby care stays `product_category = baby`; tag `audience.baby` / `kind.baby-goods` as before.
- Real gift sets/boxes/baskets stay `product_category = gifts-and-sets`; tag `format.gift-set` + `kind.gift-boxes` + `use.gift` plus the contents' kinds. Wine/spirit gift sets stay alcohol; baby gift sets stay baby. Gift cards are not gift sets.

## Kind tags from taxo_20261015_0905

These `kind.*` values were added in the 15 Oct 2026 tagging run. They are live as classifiers. Keep them when you re-judge an item.

Prepared food: `kind.dumplings`, `kind.samosas`, `kind.empanadas`, `kind.patties`, `kind.tamales`, `kind.burritos`, `kind.pupusas`, `kind.curry`, `kind.dal`, `kind.biryani`, `kind.pasta`, `kind.noodles`, `kind.rice-dishes`, `kind.sushi`, `kind.salads`, `kind.salad-greens`, `kind.stews`, `kind.bone-broth`, `kind.falafel`, `kind.shawarma`, `kind.poutine`, `kind.hummus-dips`, `kind.meal-kits`.

Meat and seafood: `kind.cured-meats`, `kind.pate`, `kind.jerky`, `kind.smoked-fish`, `kind.shellfish`, `kind.fish`, `kind.game-meat`, `kind.goat-meat`, `kind.steaks`, `kind.ground-meat`, `kind.ribs`, `kind.roasts`, `kind.bbq-meats`, `kind.meatballs`, `kind.wings`, `kind.hot-dogs`, `kind.bulk-meat`.

Bakery and sweets: `kind.tortillas`, `kind.flatbreads`, `kind.buns-rolls`, `kind.middle-eastern-sweets`, `kind.indian-sweets`, `kind.eclairs`, `kind.danishes`, `kind.squares`, `kind.loaf-cakes`, `kind.gelato`, `kind.ice-pops`, `kind.cake-pops`, `kind.caramels-toffee`, `kind.truffles`, `kind.marshmallows`, `kind.gummies`, `kind.cotton-candy`, `kind.freeze-dried-candy`.

Snacks and pantry: `kind.chips`, `kind.fish-and-chips`, `kind.popcorn`, `kind.trail-mix`, `kind.nut-butters`, `kind.nuts`, `kind.spices`, `kind.bbq-sauce`, `kind.sauces`, `kind.pasta-sauce`, `kind.oils-vinegars`, `kind.vinegars`, `kind.olives`, `kind.grains-legumes`, `kind.cereal`, `kind.baking-mixes`, `kind.tofu`, `kind.sauerkraut`.

Dairy, drinks, produce: `kind.kombucha`, `kind.kefir`, `kind.ghee`, `kind.cream`, `kind.goat-cheese`, `kind.hard-cheese`, `kind.soft-cheese`, `kind.blue-cheese`, `kind.specialty-eggs`, `kind.juice`, `kind.sodas`, `kind.mixers`, `kind.hot-chocolate`, `kind.coffee-drinks`, `kind.coffee-beans`, `kind.herbal-tea`, `kind.loose-leaf-tea`, `kind.produce-box`, `kind.sprouts`, `kind.leafy-greens`, `kind.root-vegetables`, `kind.hot-peppers`, `kind.citrus-tropical`, `kind.berries`, `kind.stone-fruit`.

Alcohol: `kind.red-wine`, `kind.white-wine`, `kind.rose-wine`, `kind.sparkling-wine`, `kind.dessert-wine`, `kind.fruit-wine`, `kind.ipa`, `kind.lager`, `kind.stout`, `kind.sour-beer`, `kind.hard-cider`, `kind.gin`, `kind.vodka`, `kind.whisky`, `kind.rum`, `kind.liqueur`, `kind.cocktails`, `kind.non-alcoholic`.

Body care: `kind.soap`, `kind.skincare`, `kind.lip-balm`, `kind.bath`, `kind.essential-oils`, `kind.deodorant`, `kind.hair-care`, `kind.cbd`, `kind.wellness`.

Goods: `kind.candles`, `kind.incense`, `kind.earrings`, `kind.necklaces`, `kind.bracelets`, `kind.rings`, `kind.hair-accessories`, `kind.keychains`, `kind.repairs`, `kind.tops`, `kind.sweaters`, `kind.dresses-bottoms`, `kind.hats-scarves`, `kind.socks`, `kind.bags`, `kind.leather-goods`, `kind.pottery`, `kind.glassware`, `kind.woodwork`, `kind.kitchen-textiles`, `kind.zero-waste`, `kind.home-decor`, `kind.art`, `kind.cards-stationery`, `kind.books`, `kind.toys`, `kind.baby-goods`, `kind.crochet-knit`, `kind.gift-cards`, `kind.gift-boxes`, `kind.workshops`, `kind.catering`, `kind.subscriptions`, `kind.houseplants`, `kind.seedlings`, `kind.seeds`, `kind.cut-flowers`, `kind.dried-flowers`, `kind.wreaths`, `kind.garden-supplies`, `kind.grills`, `kind.pet-accessories`.
