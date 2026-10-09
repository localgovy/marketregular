# Menu classifiers

Product search joins two lists you curate. A general term points at classifiers. A menu item carries classifiers. Search returns items that have them, including listings that never use the shopper's word.

The function does not name a food. Adding `picnic` is rows, not a deploy.

`product_category`, `product_slug`, `menu_section`, and `dietary` stay as they are. Do not update them from this workflow.

Service role only. These tables are not on the public API.

## Tables

`menu_classifiers` — one allowed value. `slug` is `facet.value`.

| Facet | What it means |
| --- | --- |
| `kind` | The food. Find-page slugs are already here (`kind.cookies`, `kind.croissants`). Add a value for a food with no find page (`kind.stuffing`, `kind.gravy`). |
| `use` | The job: `dessert`, `pastry`, `snack`, `side`, `main`, `appetizer`, `condiment`, `drink`, `baking`, `picnic`, `bbq`, `charcuterie`, `preserve`, `produce`, `gift`. |
| `occasion` | `thanksgiving`, `christmas`, `easter`, `halloween`, `holiday`. |
| `meal` | `breakfast`, `brunch`, `lunch`, `dinner`. |
| `ingredient` | `pumpkin`, `apple`, `chocolate`, `cranberry`, and new ones you add. |
| `diet` | `organic`, `gluten-free`, `vegan`, `vegetarian`, `dairy-free`, `halal`, `keto`. |

Facets are fixed. Insert a value under one of them. A new facet needs a migration.

`search_terms` — the phrase a shopper types, lowercase, single spaces. `desserts` and `sweets` are their own rows. There is no stemmer. Do not add `sweet` on its own. `sweet corn` must stay a whole term so it does not split.

`search_term_classifiers` — `(term, classifier_slug, weight)`.

- **3** — this classifier is what they asked for. `cookies` → `kind.cookies`. `dessert` → `use.dessert`.
- **2** — a defining member. `dessert` → `kind.cookies`. `thanksgiving` → `kind.turkey`.
- **1** — related, still retrieved, ranked lower.

`vendor_menu_classifier_assignments` — one row per classifier on an item. `source` is your run id, 1–80 characters.

`vendor_menu_classifier_reviews` — one row once you have judged the item. Zero assignment rows is a real decision. `basis` is:

```text
lower(btrim(name)) || '|' || left(coalesce(btrim(description), ''), 160)
```

## How a query matches

1. If the whole query is a term, use that term only.
2. Otherwise walk left to right and take the longest phrase that is a term. `thanksgiving dessert` is those two terms. `chocolate chip cookies` is one term.
3. The item must satisfy every term. Terms AND. Classifiers on one term OR.
4. A word that is not part of a term must appear in the item name. `chocolate dessert` is the dessert set, narrowed to names that say chocolate, until you add a `chocolate` term.
5. If nothing is a term, search stays on the item name, the old synonym list, and the trigram.

A name that contains the query ranks first, then an exact product slug, then classifier weight. Weight 3 ranks above weight 2.

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

Items already carry `kind.*` where `product_slug` is a find-page slug, and `diet.*` copied from `dietary`. Those rows use source `slug_bootstrap` and `diet_bootstrap`. They are still in this queue. Replace the item's assignments when you judge it. Do not write the bootstrap source back on top.

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

Replace one item. This deletes the bootstrap rows for that item.

```sql
delete from public.vendor_menu_classifier_assignments where menu_id = :id;

insert into public.vendor_menu_classifier_assignments (menu_id, classifier_slug, source)
values
  (:id, 'kind.pumpkin-pie', :source),
  (:id, 'use.dessert', :source),
  (:id, 'occasion.thanksgiving', :source);

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

When nothing applies, delete the assignments and still upsert the review.

## Judgment

- A cinnamon bun is pastry and dessert.
- A plain croissant is pastry only. A chocolate croissant is pastry and dessert.
- A steak pie is a main, not a dessert.
- A turkey sandwich is not thanksgiving.
- Thanksgiving is the meal: turkey, pumpkin, pumpkin or apple or pecan pie, squash, sweet potato, cranberry, stuffing, gravy, brussels sprouts, potatoes, green beans, corn, dinner rolls, apple cider. Not every vegetable.
- Christmas can overlap thanksgiving. Ham, tourtière, shortbread, gingerbread, eggnog, and fruitcake belong there when the listing is that food.
- A cookie is neither a side nor a main.
- Empty classifiers are allowed.
