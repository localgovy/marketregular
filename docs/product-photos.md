# Product photos

The products page and find pages read `product_photos`. An empty table is the normal state. The page draws a paper plate until a row exists.

Service role only. This table is not on the public API. Do not grant `anon` or `authenticated`.

`product_category`, `product_slug`, and find-page copy stay as they are. This workflow only adds pictures.

## Table

`product_photos` — one row per picture.

| Column | What to write |
| --- | --- |
| `subject` | `aisle`, `product`, or `hero`. |
| `slug` | The aisle id, the find-page slug, or `products` for the hero. |
| `image_url` | The public object URL. Null is allowed and shows nothing. |
| `alt` | One sentence, 1–160 characters, naming the food. |

The object name has to match the row. A vegetables aisle is `aisle/vegetables.webp`, and the URL has to end in `/product-photos/aisle/vegetables.webp`. A mismatched path is rejected.

Allowed files are JPEG, PNG, and WebP, up to 5 MB. The bucket is `product-photos`. It is public to read. Upload with the service role. There is no insert policy for signed-in users, and the service role does not need one.

```js
const { error } = await supabase.storage.from("product-photos").upload(
  "aisle/vegetables.webp",
  bytes,
  { contentType: "image/webp", upsert: true, cacheControl: "31536000" },
);
if (error) throw error;
const { data } = supabase.storage.from("product-photos").getPublicUrl("aisle/vegetables.webp");
```

Then insert the public URL. Use this project's host (`pxsndrlptceafhsxfays.supabase.co`). Do not hotlink another site.

```sql
insert into public.product_photos (subject, slug, image_url, alt)
values (
  'aisle',
  'vegetables',
  'https://pxsndrlptceafhsxfays.supabase.co/storage/v1/object/public/product-photos/aisle/vegetables.webp',
  'Vegetables at a market stall'
)
on conflict (subject, slug) do update
set image_url = excluded.image_url,
    alt = excluded.alt;
```

A product row is used before the aisle row. The aisle row is the fallback for every find page in that aisle. The hero is `subject = 'hero'`, `slug = 'products'`, path `hero/products.webp`. It shows on the products page only, and only from the large layout up.

The products page caches the table for 2 minutes. A find page can keep a photo for up to an hour.

## Aisles

One row each. `subject` is `aisle`.

- `bread-and-bakery`
- `pies-and-sweets`
- `prepared-foods`
- `vegetables`
- `apples-and-fruit`
- `meat-and-turkey`
- `seafood`
- `eggs`
- `cheese-and-dairy`
- `honey`
- `maple`
- `preserves-and-sauces`
- `nuts-and-snacks`
- `coffee-and-tea`
- `beverages`
- `alcohol`

The first six are the large tiles: vegetables, fruit, bread and bakery, pies and sweets, cheese and dairy, prepared food.

## Products

One row each. `subject` is `product`. The slug is the find page, without `/find/`.

These are the pages the directory links to. Do not seed a slug that redirects to `/products` (oranges, milk, burgers, and the rest of `FIND_SLUGS_AT_PRODUCTS` in `src/data/find-redirects.ts`).

- `bread-toronto`
- `sourdough-toronto`
- `bagels-toronto`
- `croissants-toronto`
- `focaccia-toronto`
- `scones-toronto`
- `muffins-toronto`
- `cookies-toronto`
- `pies-toronto`
- `butter-tarts-toronto`
- `cakes-toronto`
- `brownies-toronto`
- `cinnamon-buns-toronto`
- `donuts-toronto`
- `tarts-toronto`
- `soups-toronto`
- `sandwiches-toronto`
- `pizza-toronto`
- `meat-pies-toronto`
- `quiche-toronto`
- `perogies-toronto`
- `butter-chicken-toronto`
- `jerk-chicken-toronto`
- `tomatoes-toronto`
- `garlic-toronto`
- `carrots-toronto`
- `potatoes-toronto`
- `peppers-toronto`
- `beans-toronto`
- `beets-toronto`
- `cucumbers-toronto`
- `onions-toronto`
- `sweet-corn-toronto`
- `squash-toronto`
- `zucchini-toronto`
- `lettuce-toronto`
- `kale-toronto`
- `broccoli-toronto`
- `spinach-toronto`
- `mushrooms-toronto`
- `herbs-toronto`
- `asparagus-toronto`
- `eggplant-toronto`
- `pumpkins-toronto`
- `microgreens-toronto`
- `bok-choy-toronto`
- `okra-toronto`
- `apples-toronto`
- `strawberries-toronto`
- `raspberries-toronto`
- `blueberries-toronto`
- `blackberries-toronto`
- `peaches-toronto`
- `pears-toronto`
- `plums-toronto`
- `cherries-toronto`
- `rhubarb-toronto`
- `apricots-toronto`
- `beef-toronto`
- `pork-toronto`
- `chicken-toronto`
- `sausages-toronto`
- `lamb-toronto`
- `bacon-toronto`
- `peameal-bacon-toronto`
- `turkey-toronto`
- `pepperettes-toronto`
- `seafood-toronto`
- `eggs-toronto`
- `cheese-toronto`
- `honey-toronto`
- `creamed-honey-toronto`
- `maple-syrup-toronto`
- `maple-butter-toronto`
- `jams-toronto`
- `pickles-toronto`
- `preserves-toronto`
- `apple-butter-toronto`
- `dried-fruits-toronto`
- `coffee-toronto`
- `tea-toronto`
- `apple-cider-toronto`
- `wine-toronto`

## Hero

Optional. One row.

| subject | slug | path |
| --- | --- | --- |
| `hero` | `products` | `hero/products.webp` |
