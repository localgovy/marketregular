# Find-page accuracy audit, 2026-09-30

Trigger: Noah saw candles on the "lemon" find page. Scope: all 155 terms in `find-page-terms-2026-09-30.csv`, against `vendor_menus` (Supabase `pxsndrlptceafhsxfays`, 14,946 rows). Times ET.

## Headline

| Measure | Before | After |
|---|---|---|
| Find-page path (slug-matched, published vendor, linked to published market): items across 155 terms | 1,844 items, **57 wrong (3.1%)**, 29 terms affected | 1,857 items, **0 wrong (0.0%)** |
| `search_products` RPC path (top 40 per term, 155 terms) | 5,662 rows, **394 wrong (7.0%)** | 4,455 rows, **0 non-food / null category, 0 non-food-vendor, 0 scent-keyword rows** |
| Terms with any wrong item | 105 (RPC) / 29 (find page) | 0 |
| Terms with < 5 distinct vendors | 0 by CSV (stale), 7 real | 0 after merges/drops |

"Wrong" = non-food category or null category, vendor in a non-food context (candle/soap/body care/craft/pet), scent/flavour-only item (keyword guard), or ingredient slug on a flavour-only row at a shave-ice/pop/ice-cream vendor, or a food item in the wrong food category.
Residual judgement calls in the RPC after-state: a handful of real dessert names that contain an ingredient word (Marble Slab "Chocolate Banana", Kate's Scoop "Milk & Cookies") can still match by name. I cleared their slugs so they no longer appear on find pages. The RPC can still show them for a free-text search of "banana", which is acceptable (they are food).

## Root causes (quantified on the RPC path, before fix)

1. **Classifier ignored vendor context and description** (biggest). Scent/flavour words in names of candles, soaps, body care, dog treats and crafts got a food category and slug. 258 non-food-category rows and 77 non-food-vendor rows in the 5,662 RPC results. Examples: Dazzling Candles "Lemon | Activation | Clarity" and "Blueberry | Opening | Feeling", Scents and Embers "Cherry", Gorgeous and Beautiful "Strawberry", Sasa Naturals Carrot/Beet/Pumpkin, Murphy's Own Blueberry, D'Amore "Cinnamon Bun".
2. **No food-category gate in `search_products` or find pages.** The RPC returned any category. The "lemon" query returned 40 rows incl. candles, soaps, hydrosols.
3. **RPC matched on description** ("notes of maple syrup" in candles) and **loose trigram/substring** (pears -> Pearls, pendants), and multi-word queries matched single-word names (cherry tomatoes -> plain Tomatoes).
4. **Flavour-only items at frozen-treat vendors** (Marble Slab, Ono Ka Hau, Happy Pops, The Pop Stand, LunaLuna, Geladona, Kate's Scoop, Fujwara's, A-Pops, Fresh Pops) carried ingredient slugs: "Lemon", "Strawberry (LFY)", "Mango".
5. **Overbroad keyword rules** in classifier v1.2: oil -> sauces, butter/cream -> dairy, bar/gift set -> sweets, bowl/tea/espresso -> food, and the reverse errors (bag/tray/handmade/gold/dragon marking real food as craft/jewellery; 46 food rows restored).
6. **Specific category errors**: milk as a craft, bagels as a craft, candy cane beets as sweets, 23 oyster/other mushrooms as seafood, black garlic as a plant, mead as honey, Gunn's Hill cheeses as vegetables, wine gift sets as sweets/sauces, beeswax candles/wraps as honey, seedlings as vegetables, generic "Veggie" variants slugged `vegetables`.
7. **Synonyms table: not a cause.** Its category branch was already limited to canonical term = category. No synonym rows changed. (Synonym hits such as Salad Greens -> lettuce and Bokchoy -> bok choy are legitimate.)

## Fixes applied (all live)

- **Rows updated in `vendor_menus`: 802** tagged `product_category_source='manual_audit_0930'` (781 category changes, 321 slugs cleared).
  - 220 food -> non-food category (candles, soaps, body care, pet treats, seedlings, apparel, stationery, etc.), slug cleared.
  - 52 null/non-food -> food category with slug (milk, bagels, chickens, turkeys, cabbages, quiches, pot pies, peameal, etc.).
  - 165 food -> other food category (mushrooms out of seafood, mead to alcohol, wine gift sets to alcohol, flavour rows at frozen vendors to pies-and-sweets, etc.).
  - Non-food vendor context: 82 vendors in `private.product_vendor_context` (kind `nonfood`), 12 `frozen`.
- **Classifier v1.3** (`sql/classifier_v1_3.sql`): `private.nonfood_guard_v1_3(name, desc)` catches scent/flavour non-food keywords (candle, wax, diffuser, soap, balm, salve, serum, scrub, hydrosol, bath, body butter, face/hair oil, seedling, bouquet, grow kit, dog treats, tea towel/cozy/infuser, apparel, stationery, ornament, gift card, etc.), then mead -> alcohol, mushroom -> vegetables, wine gift sets -> alcohol; else falls through to v1.2. `private.classify_product_v1_3(text)` is the entry point.
- **`public.search_products` v2** (`sql/search_products_v2.sql`): food gate in every branch (unless the query itself is a non-food term: candle, soap, lotion, balm, flower, plant, jewel*, craft, art, clothing, toy, pottery, skincare); full-text on `name` only; trigram only for single-word queries with similarity >= 0.45; null category never matches.
- Known limitation: some null-category rows I gave a category may be broader than before ("Pot Pies" -> meat-pies, "Savory Pies"). Spelling variants not in the audited terms may still have null category; they simply do not show (safe).

## Exact matching rule for the frontend (document in the prompt)

```sql
SELECT vm.*, v.* FROM vendor_menus vm
JOIN vendors v ON v.id = vm.vendor_id
WHERE vm.product_slug = ANY(:page_match_slugs)            -- exact slug, never ILIKE/substring/description/fuzzy
  AND vm.product_category IN ('bread-and-bakery','eggs','honey','cheese-and-dairy','maple',
        'apples-and-fruit','vegetables','meat-and-turkey','pies-and-sweets','prepared-foods',
        'preserves-and-sauces','coffee-and-tea','alcohol','seafood','flour-and-grains',
        'nuts-and-snacks','beverages')                    -- food/drink gate (NEW: null and non-food categories never match)
  AND v.status = 'published'
  AND EXISTS (SELECT 1 FROM market_vendors mv JOIN markets m ON m.id = mv.market_id
              WHERE mv.vendor_id = v.id AND m.status = 'published');
```
- Null `product_slug` never matches. Non-food categories (body-care, candles-and-crafts, jewellery-and-accessories, plants-and-flowers, other) never appear on a food find page.
- Page renders only if `COUNT(DISTINCT vendor_id) >= 5` on that query (live, not the CSV number). Merged pages use several slugs in `match_slugs` (see v2 CSV).
- Code change: `menuRows()` in `src/lib/data/product-search.ts` currently does `.in("product_slug", slugs)` only; add `.in("product_category", FOOD_CATEGORIES)`.
- Search: use `search_products` v2 as deployed. Ingest: every new menu row must go through `classify_product_v1_3`, and vendors in `private.product_vendor_context` (kind `nonfood`) must never receive a food category or slug.

## Terms removed / merged (155 -> 148)

| Old term | Live vendors | Action |
|---|---|---|
| lemon | 4 | merged into new **Citrus** page (lemon, oranges, limes, clementines, grapefruit; 7 vendors) |
| oranges | 5 | merged into **Citrus** |
| mango | 3 | merged into new **Tropical fruit** page (mango, pineapple, bananas, passion fruit, guava, papaya, coconut, lychee; 5 vendors) |
| pineapple | 3 | merged into **Tropical fruit** |
| bananas | 4 | merged into **Tropical fruit** |
| matcha | 3 | merged into **tea** (15 vendors incl. matcha) |
| cheesecake | 4 | merged into **cakes** (13 vendors) |
| celery | 4 | dropped (covered by /find/vegetables-toronto) |
| corn | 9 | merged into **sweet corn** (24 vendors; the frontend already does this) |

New terms: citrus, tropical fruit. Removed: 9. Final term count: **148** (146 kept + 2 new). Every remaining term has >= 5 live distinct vendors (minimum 5: e.g. apple cider, apple fritter, baked goods, caesar salad, greek salad, broccoli microgreens, pumpkin pie, riesling, salads, thyme, turnip, parsnips and others). Borderline ones should be rechecked live before each deploy. If the frontend keeps separate lemon/oranges/mango/pineapple/bananas/matcha/cheesecake/celery pages, hide them (they fall under the 5-vendor rule); redirect to the merged page. Files: `find-page-terms-2026-09-30-v2.csv` (columns: term, slug, find_path, distinct_vendors, category, match_slugs, note). Original CSV unchanged.

## Wrong items found on find pages (before), by term

Format: term | vendor | item | fix.

| Term | Vendor | Item | Fix |
|---|---|---|---|
| bananas | Marble Slab Creamery | Banana (flavour) | apples-and-fruit -> pies-and-sweets, slug cleared |
| bananas | Ono Ka Hau Shave Ice | Banana (flavour) | same |
| beets | Sasa Naturals | Beet (body care) | vegetables -> body-care |
| blueberries | Dazzling Candles | Blueberry  |  Opening  |
| blueberries | Marble Slab Creamery | Blueberry (LFY) (flavour) | -> pies-and-sweets |
| blueberries | Murphy's Own | Blueberry 2oz / 6oz (dog treats) | -> other (x2) |
| blueberries | St. Urbain Bagel | blueberry (bagel) | -> bread-and-bakery/bagels |
| carrots | Sasa Naturals | Carrot (body care) | -> body-care |
| carrots | Sweet Nutritionista | Carrot (cake flavour) | -> pies-and-sweets |
| celery | Freshouse Juice Bar | Pure Celery (juice) | -> beverages |
| cheesecake | Marble Slab Creamery | Cheesecake (LFY) (ice-cream flavour) | -> pies-and-sweets, slug cleared |
| cherries | Elora Tea | Cherry (tea flavour) | -> coffee-and-tea |
| cherries | Ono Ka Hau | Cherry (flavour) | -> pies-and-sweets |
| cherries | Scents and Embers | Cherry (candle) | -> candles-and-crafts |
| cinnamon buns | D'Amore Candles | Cinnamon Bun (candle) | -> candles-and-crafts |
| coffee | Happy Pops / Marble Slab | Coffee (flavour) x2 | -> pies-and-sweets |
| eggplant | Jones Family Greens | Eggplant seedling 3.5" pot | vegetables -> plants-and-flowers |
| fruit | Produce Place | Fruit Salad Bowl Small/Large | -> prepared-foods |
| grapes | Marble Slab / Ono Ka Hau | Grape (flavour) x2 | -> pies-and-sweets |
| honey | Lofty Butter Company | Honey - Cultured Butter Compound | -> cheese-and-dairy, slug cleared |
| lemon | Dazzling Candles | Lemon  |  Activation  |
| lemon | Ono Ka Hau | Lemon (flavour) | -> pies-and-sweets |
| mango | Geladona / Happy Pops / Ono Ka Hau | Mango (flavour) x3 | -> pies-and-sweets |
| matcha | Happy Pops / Marble Slab / Sweet Nutritionista | Matcha (flavour) x3 | -> pies-and-sweets |
| onions | St. Urbain Bagel | onion (bagel) | -> bagels |
| oranges | Happy Pops / Marble Slab | Orange (flavour) x2 | -> pies-and-sweets |
| pineapple | Marble Slab / Ono Ka Hau | Pineapple (flavour) x2 | -> pies-and-sweets |
| pumpkins | Itty Bitty Pie Co. | 9" Pumpkin (pie) | -> pies-and-sweets/pies |
| pumpkins | Sasa Naturals | Pumpkin (body care) | -> body-care |
| pumpkins | Tart Boss | Pumpkin (tart) | -> pies-and-sweets/tarts |
| raspberries | LunaLuna Ice / Marble Slab | Raspberry (flavour) x2 | -> pies-and-sweets |
| spinach | Deb's Dips | Spinach (dip) | -> preserves-and-sauces |
| strawberries | Geladona / Marble Slab / Ono Ka Hau | Strawberry (flavour) x3 | -> pies-and-sweets |
| strawberries | Gorgeous and Beautiful | Strawberry (candle/soap) | -> candles-and-crafts |
| sweet potatoes | Andrzejewski Perogi Shop | Sweet Potato (4) (perogies) | -> prepared-foods/perogies |
| vegetables | Fiesta Empanadas / Uncle Dad's Pizza | Veggie (empanada/pizza variant) | -> prepared-foods, slug cleared |
| milk | SEED | Milk 4L x2 (was a craft) | candles-and-crafts -> cheese-and-dairy/milk (now a correct match; gained) |
| bagels | Gemaro | Bagels (was a craft) | -> bread-and-bakery/bagels (gained) |
| black garlic | Botanist Alchemy | Black garlic (was plants) | -> vegetables (gained) |
| beets | New Leaf Market Garden | Beets (Candy Cane) (was sweets) | -> vegetables/beets (gained) |

The RPC path had many more (394 rows, e.g. rosemary 18, preserves 12, apricots 11, pumpkins 8, eggplant 8, lemon 7, zucchini 6, oranges 6, olive oil 6, greens 6, celery 6, tea 5). Those came from description/fuzzy matching and non-food categories and are removed by RPC v2 (per-term numbers below).

## Worst terms

Find page path, before (wrong/total): blueberries 5/17 (29%), strawberries 4/25, cherries 3/13, mango 3/6 (50%), matcha 3/6 (50%), pumpkins 3/15, lemon 2/6 (33%), pineapple 2/5 (40%), bananas 2/7, oranges 2/7, grapes 2/7, milk 2/10, mushrooms 2/14, beets/carrots/coffee/fruit/raspberries/vegetables 2 each.
RPC path, before (wrong of 40 returned): rosemary 18, preserves 12, apricots 11, ice cream 11, lemonade 13, lemon 12, oranges 10, mango 9, matcha 9.

## Per-term before/after

Columns: FP = find-page path (slug-matched). Wrong after is 0 for every term. "Vendors raw" = distinct vendors before, unfiltered. "Vendors after" = distinct eligible vendors live now. RPC = `search_products` rows returned (cap 40); "RPC wrong before" counts non-food category, non-food vendor and scent-keyword rows only (305 of the 394; the other ~89 were frozen-flavour rows, not broken out per term).

| Term | FP items before | FP wrong before | % wrong | FP items after | FP wrong after | Vendors raw | Vendors after | RPC rows before | RPC wrong before | RPC rows after | Action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| vegetables | 88 | 2 | 2% | 86 | 0 | 88 | 86 | 40 | 0 | 40 | kept |
| honey | 69 | 1 | 1% | 68 | 0 | 53 | 52 | 40 | 0 | 40 | kept |
| tomatoes | 36 | 0 | 0% | 36 | 0 | 36 | 36 | 40 | 0 | 40 | kept |
| maple syrup | 43 | 0 | 0% | 43 | 0 | 35 | 35 | 40 | 0 | 40 | kept |
| garlic | 35 | 0 | 0% | 35 | 0 | 34 | 34 | 40 | 0 | 40 | kept |
| eggs | 32 | 0 | 0% | 32 | 0 | 32 | 32 | 40 | 0 | 40 | kept |
| cookies | 30 | 0 | 0% | 30 | 0 | 30 | 30 | 40 | 0 | 40 | kept |
| bread | 31 | 0 | 0% | 31 | 0 | 29 | 29 | 40 | 0 | 40 | kept |
| carrots | 30 | 2 | 7% | 28 | 0 | 29 | 27 | 40 | 1 | 40 | kept |
| apples | 26 | 0 | 0% | 26 | 0 | 26 | 26 | 40 | 0 | 40 | kept |
| beans | 27 | 0 | 0% | 27 | 0 | 25 | 25 | 40 | 0 | 40 | kept |
| strawberries | 25 | 4 | 16% | 21 | 0 | 25 | 21 | 40 | 1 | 40 | kept |
| beets | 27 | 2 | 7% | 26 | 0 | 24 | 23 | 40 | 1 | 40 | kept |
| raspberries | 24 | 2 | 8% | 22 | 0 | 24 | 22 | 40 | 0 | 40 | kept |
| herbs | 23 | 0 | 0% | 23 | 0 | 23 | 23 | 40 | 0 | 40 | kept |
| peppers | 26 | 0 | 0% | 26 | 0 | 23 | 23 | 40 | 0 | 40 | kept |
| fruit | 28 | 2 | 7% | 26 | 0 | 20 | 20 | 40 | 0 | 40 | kept |
| chicken | 19 | 0 | 0% | 20 | 0 | 19 | 20 | 40 | 1 | 40 | kept |
| cucumbers | 19 | 0 | 0% | 19 | 0 | 19 | 19 | 40 | 4 | 40 | kept |
| pies | 19 | 0 | 0% | 20 | 0 | 19 | 20 | 40 | 5 | 40 | kept |
| potatoes | 19 | 0 | 0% | 19 | 0 | 19 | 19 | 40 | 0 | 40 | kept |
| beef | 18 | 0 | 0% | 18 | 0 | 18 | 18 | 40 | 0 | 40 | kept |
| eggplant | 18 | 1 | 6% | 17 | 0 | 18 | 17 | 40 | 8 | 30 | kept |
| pork | 16 | 0 | 0% | 16 | 0 | 16 | 16 | 40 | 0 | 40 | kept |
| butter tarts | 21 | 0 | 0% | 23 | 0 | 15 | 17 | 40 | 1 | 40 | kept |
| cheese | 15 | 0 | 0% | 15 | 0 | 15 | 15 | 40 | 0 | 40 | kept |
| onions | 15 | 1 | 7% | 15 | 0 | 15 | 15 | 40 | 1 | 40 | kept |
| pumpkins | 15 | 3 | 20% | 12 | 0 | 15 | 12 | 40 | 8 | 40 | kept |
| sweet corn | 15 | 0 | 0% | 15 | 0 | 15 | 15 | 40 | 0 | 18 | kept; absorbs corn |
| asparagus | 15 | 0 | 0% | 15 | 0 | 14 | 14 | 19 | 0 | 19 | kept |
| blueberries | 17 | 5 | 29% | 12 | 0 | 14 | 10 | 40 | 4 | 40 | kept |
| broccoli | 14 | 0 | 0% | 15 | 0 | 14 | 15 | 40 | 3 | 35 | kept |
| kale | 14 | 0 | 0% | 14 | 0 | 14 | 14 | 40 | 3 | 37 | kept |
| sausages | 14 | 0 | 0% | 15 | 0 | 14 | 15 | 40 | 1 | 40 | kept |
| soups | 14 | 0 | 0% | 14 | 0 | 14 | 14 | 40 | 4 | 40 | kept |
| zucchini | 14 | 0 | 0% | 15 | 0 | 14 | 15 | 30 | 6 | 23 | kept |
| cherries | 13 | 3 | 23% | 10 | 0 | 13 | 10 | 40 | 2 | 40 | kept |
| croissants | 15 | 0 | 0% | 15 | 0 | 13 | 13 | 40 | 1 | 40 | kept |
| jams | 13 | 0 | 0% | 13 | 0 | 13 | 13 | 40 | 0 | 40 | kept |
| lettuce | 14 | 0 | 0% | 14 | 0 | 13 | 13 | 40 | 0 | 40 | kept |
| plums | 13 | 0 | 0% | 13 | 0 | 13 | 13 | 35 | 5 | 23 | kept |
| spinach | 13 | 1 | 8% | 12 | 0 | 13 | 12 | 40 | 0 | 40 | kept |
| squash | 13 | 0 | 0% | 16 | 0 | 13 | 15 | 40 | 5 | 40 | kept |
| tea | 13 | 0 | 0% | 13 | 0 | 13 | 13 | 40 | 5 | 40 | kept; absorbs matcha |
| coffee | 13 | 2 | 15% | 11 | 0 | 12 | 10 | 40 | 2 | 40 | kept |
| peaches | 12 | 0 | 0% | 13 | 0 | 12 | 13 | 40 | 1 | 40 | kept |
| pears | 12 | 0 | 0% | 12 | 0 | 12 | 12 | 40 | 4 | 34 | kept |
| pickles | 12 | 0 | 0% | 12 | 0 | 12 | 12 | 40 | 2 | 40 | kept |
| microgreens | 11 | 0 | 0% | 14 | 0 | 11 | 14 | 40 | 3 | 39 | kept |
| radishes | 11 | 0 | 0% | 11 | 0 | 11 | 11 | 37 | 3 | 29 | kept |
| arugula | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 28 | 3 | 12 | kept |
| cakes | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 40 | 1 | 40 | kept; absorbs cheesecake |
| cauliflower | 11 | 0 | 0% | 11 | 0 | 10 | 10 | 25 | 1 | 22 | kept |
| cinnamon buns | 10 | 1 | 10% | 9 | 0 | 10 | 9 | 40 | 3 | 21 | kept |
| heirloom tomatoes | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 40 | 0 | 14 | kept |
| lamb | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 40 | 1 | 40 | kept |
| peas | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 40 | 3 | 40 | kept |
| pizza | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 40 | 0 | 40 | kept |
| preserves | 10 | 0 | 0% | 10 | 0 | 10 | 10 | 40 | 12 | 17 | kept |
| scones | 10 | 0 | 0% | 11 | 0 | 10 | 11 | 26 | 1 | 26 | kept |
| apple pie | 10 | 0 | 0% | 10 | 0 | 9 | 9 | 40 | 0 | 22 | kept |
| bagels | 11 | 1 | 9% | 13 | 0 | 10 | 11 | 40 | 2 | 40 | kept |
| brownies | 9 | 0 | 0% | 10 | 0 | 9 | 10 | 40 | 2 | 35 | kept |
| chocolate chip cookies | 9 | 0 | 0% | 10 | 0 | 9 | 10 | 40 | 1 | 23 | kept |
| corn | 9 | 0 | 0% | 9 | 0 | 9 | 9 | 40 | 2 | 40 | merged into sweet corn |
| focaccia | 9 | 0 | 0% | 9 | 0 | 9 | 9 | 24 | 2 | 20 | kept |
| grass fed beef | 9 | 0 | 0% | 9 | 0 | 9 | 9 | 40 | 2 | 39 | kept |
| leeks | 9 | 0 | 0% | 9 | 0 | 9 | 9 | 16 | 0 | 14 | kept |
| maple butter | 12 | 0 | 0% | 12 | 0 | 9 | 9 | 40 | 0 | 20 | kept |
| nectarines | 9 | 0 | 0% | 9 | 0 | 9 | 9 | 14 | 2 | 11 | kept |
| pastries | 9 | 0 | 0% | 9 | 0 | 9 | 9 | 40 | 2 | 19 | kept |
| sandwiches | 9 | 0 | 0% | 10 | 0 | 9 | 10 | 40 | 0 | 40 | kept |
| apricots | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 35 | 11 | 22 | kept |
| bacon | 9 | 0 | 0% | 9 | 0 | 8 | 8 | 40 | 0 | 40 | kept |
| butter chicken | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 1 | 19 | kept |
| cherry tomatoes | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 1 | 13 | kept |
| comb honey | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 0 | 10 | kept |
| creamed honey | 9 | 0 | 0% | 9 | 0 | 8 | 8 | 40 | 2 | 31 | kept |
| cupcakes | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 0 | 36 | kept |
| dried fruits | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 1 | 8 | kept |
| green beans | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 0 | 10 | kept |
| meats | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 1 | 40 | kept |
| rhubarb | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 28 | 0 | 25 | kept |
| smoothies | 8 | 0 | 0% | 8 | 0 | 8 | 8 | 40 | 1 | 35 | kept |
| tarts | 8 | 0 | 0% | 9 | 0 | 8 | 9 | 40 | 0 | 40 | kept |
| bee pollen | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 10 | 1 | 9 | kept |
| burgers | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 40 | 1 | 40 | kept |
| grapes | 7 | 2 | 29% | 5 | 0 | 7 | 5 | 40 | 5 | 26 | kept |
| jellies | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 34 | 3 | 28 | kept |
| muffins | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 40 | 1 | 40 | kept |
| mushrooms | 14 | 2 | 14% | 35 | 0 | 7 | 14 | 40 | 0 | 40 | kept |
| oranges | 7 | 2 | 29% | 5 | 0 | 7 | 5 | 40 | 6 | 40 | merged into new Citrus page |
| pepperettes | 9 | 0 | 0% | 9 | 0 | 7 | 7 | 40 | 0 | 40 | kept |
| romaine lettuce | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 40 | 0 | 10 | kept |
| rosemary | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 40 | 18 | 20 | kept |
| sauces | 8 | 0 | 0% | 8 | 0 | 7 | 7 | 40 | 0 | 40 | kept |
| spices | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 40 | 3 | 40 | kept |
| summer sausage | 7 | 0 | 0% | 8 | 0 | 7 | 8 | 40 | 1 | 13 | kept |
| sweet potatoes | 7 | 1 | 14% | 6 | 0 | 7 | 6 | 40 | 1 | 30 | kept |
| tacos | 7 | 0 | 0% | 7 | 0 | 7 | 7 | 34 | 2 | 30 | kept |
| turkey | 7 | 0 | 0% | 8 | 0 | 7 | 8 | 40 | 1 | 40 | kept |
| almond croissant | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 1 | 9 | kept |
| apple butter | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 1 | 11 | kept |
| bananas | 7 | 2 | 29% | 5 | 0 | 6 | 4 | 40 | 3 | 40 | merged into new Tropical fruit page |
| basil | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 4 | 32 | kept |
| blackberries | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 2 | 24 | kept |
| bok choy | 6 | 0 | 0% | 9 | 0 | 6 | 9 | 12 | 4 | 10 | kept |
| free range chicken | 6 | 0 | 0% | 7 | 0 | 6 | 7 | 40 | 1 | 8 | kept |
| honeycomb | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 0 | 40 | kept |
| hot sauce | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 1 | 40 | kept |
| lemon | 6 | 2 | 33% | 4 | 0 | 6 | 4 | 40 | 7 | 40 | merged into new Citrus page |
| mango | 6 | 3 | 50% | 3 | 0 | 6 | 3 | 40 | 1 | 40 | merged into new Tropical fruit page |
| matcha | 6 | 3 | 50% | 3 | 0 | 6 | 3 | 28 | 5 | 20 | merged into tea |
| meat pies | 6 | 0 | 0% | 10 | 0 | 6 | 10 | 40 | 2 | 11 | kept |
| okra | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 16 | 2 | 11 | kept |
| olive oil | 6 | 0 | 0% | 6 | 0 | 6 | 6 | 40 | 6 | 32 | kept |
| peameal bacon | 6 | 0 | 0% | 8 | 0 | 6 | 8 | 31 | 3 | 11 | kept |
| sausage roll | 7 | 0 | 0% | 7 | 0 | 6 | 6 | 40 | 1 | 8 | kept |
| apple cider | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 4 | 21 | kept |
| apple fritter | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 2 | 8 | kept |
| baked goods | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 26 | 3 | 15 | kept |
| black garlic | 8 | 1 | 12% | 8 | 0 | 6 | 6 | 40 | 1 | 14 | kept |
| breakfast sausage | 6 | 0 | 0% | 6 | 0 | 5 | 5 | 40 | 4 | 16 | kept |
| broccoli microgreens | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 0 | 5 | kept |
| cabbage | 9 | 0 | 0% | 10 | 0 | 5 | 6 | 40 | 1 | 40 | kept |
| caesar salad | 6 | 0 | 0% | 6 | 0 | 5 | 5 | 40 | 0 | 13 | kept |
| celery | 5 | 1 | 20% | 4 | 0 | 5 | 4 | 25 | 6 | 14 | dropped (4 vendors; covered by /find/vegetables-toronto) |
| cheesecake | 5 | 1 | 20% | 4 | 0 | 5 | 4 | 40 | 0 | 40 | merged into cakes |
| chutneys | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 23 | 1 | 19 | kept |
| desserts | 5 | 0 | 0% | 6 | 0 | 5 | 6 | 27 | 3 | 14 | kept |
| dill | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 1 | 40 | kept |
| donuts | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 23 | 3 | 14 | kept |
| fish | 5 | 0 | 0% | 6 | 0 | 5 | 6 | 40 | 5 | 27 | kept |
| garlic powder | 7 | 0 | 0% | 7 | 0 | 5 | 5 | 40 | 1 | 13 | kept |
| garlic scapes | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 1 | 10 | kept |
| greek salad | 6 | 0 | 0% | 6 | 0 | 5 | 5 | 40 | 1 | 8 | kept |
| green onions | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 0 | 10 | kept |
| greens | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 6 | 40 | kept |
| ice cream | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 0 | 38 | kept |
| jerk chicken | 5 | 0 | 0% | 6 | 0 | 5 | 6 | 40 | 2 | 19 | kept |
| juices | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 0 | 40 | kept |
| lemonade | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 40 | 3 | 30 | kept |
| melons | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 20 | 3 | 14 | kept |
| milk | 10 | 2 | 20% | 10 | 0 | 5 | 5 | 40 | 4 | 40 | kept |
| parsley | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 34 | 4 | 13 | kept |
| parsnips | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 9 | 0 | 5 | kept |
| perogies | 5 | 0 | 0% | 6 | 0 | 5 | 6 | 21 | 4 | 16 | kept |
| pineapple | 5 | 2 | 40% | 3 | 0 | 5 | 3 | 40 | 0 | 40 | merged into new Tropical fruit page |
| poultry | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 11 | 0 | 8 | kept |
| pumpkin pie | 6 | 0 | 0% | 6 | 0 | 5 | 5 | 40 | 5 | 14 | kept |
| quiche | 7 | 0 | 0% | 10 | 0 | 5 | 8 | 16 | 4 | 15 | kept |
| riesling | 6 | 0 | 0% | 6 | 0 | 5 | 5 | 40 | 0 | 40 | kept |
| salads | 7 | 0 | 0% | 7 | 0 | 5 | 5 | 40 | 1 | 40 | kept |
| thyme | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 15 | 1 | 10 | kept |
| turnip | 5 | 0 | 0% | 5 | 0 | 5 | 5 | 10 | 1 | 8 | kept |

## Rollback / housekeeping

- Snapshot of all 14,853 rows before changes: `private.audit_0930_backup(id, product_category, product_slug, product_category_source)`. Rollback: `UPDATE vendor_menus m SET product_category=b.product_category, product_slug=b.product_slug, product_category_source=b.product_category_source FROM private.audit_0930_backup b WHERE b.id=m.id AND m.product_category_source='manual_audit_0930';` (rows added after the snapshot are not in it).
- Vendor context table kept: `private.product_vendor_context`. Audit scratch tables (`audit_terms/_fix/_fix2/_result/_rpc_before/_rpc_after/_vendor_ctx_snapshot`) dropped after this report.
- Migrations: `classifier_v1_3_nonfood_guard`, `search_products_v2_food_gate`, `search_products_v2_1_trigram_single_word`. SQL copies in `gta/sql/`.
- Follow-ups: (1) apply the frontend rule above; (2) make importers call `classify_product_v1_3` (no trigger created); (3) new rows with null category will simply not appear on find pages.
