# Menu item photos

A menu row can have one picture. The stall page, find pages, product search, the home table rows, saved products, and the buy page show it beside the item name. No row means the line stays text.

Service role only. This table is not on the public API. Do not grant `anon` or `authenticated`.

`product_category`, `product_slug`, `menu_section`, and `dietary` stay as they are. This workflow only adds the picture. A vendor edit of the name or price leaves the picture in place.

## Table

`menu_item_photos` — one row per menu item. No row means no picture.

| Column | What to write |
| --- | --- |
| `menu_id` | `vendor_menus.id` for that item. |
| `image_url` | The public object URL. The path has to be `menu-photos/{menu_id}/{file}.webp` (jpeg and png are allowed). |

The object name has to include that menu id. A picture for another item, a hotlink, or a `/storage/v1/render/image/` URL is rejected. Do not use the transform API. Each transformed original is billed, and the site serves the file you upload.

Allowed files are JPEG, PNG, and WebP, up to 256 KB. The bucket is `menu-photos`. It is public to read by URL. It cannot be listed. Upload with the service role. There is no insert policy for signed-in users, and the service role does not need one.

Make a square picture of the food filling the frame, with no words, logo, or border in the image. Encode WebP, longest edge 800 px, quality about 80. That is usually under 120 KB and stays sharp at the size the site draws.

Use a new file name when you replace a picture. The upload cache is one year, so the same object name would keep the old picture. After the row points at the new URL, delete the old object.

```js
const menuId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const objectName = `${menuId}/hoops.webp`;
const { error } = await supabase.storage.from("menu-photos").upload(objectName, bytes, {
  contentType: "image/webp",
  upsert: false,
  cacheControl: "31536000",
});
if (error) throw error;
const { data } = supabase.storage.from("menu-photos").getPublicUrl(objectName);
```

Then insert the public URL. Use this project's host (`pxsndrlptceafhsxfays.supabase.co`). Do not hotlink another site.

```sql
insert into public.menu_item_photos (menu_id, image_url)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'https://pxsndrlptceafhsxfays.supabase.co/storage/v1/object/public/menu-photos/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/hoops.webp'
)
on conflict (menu_id) do update
set image_url = excluded.image_url;
```

A replacement uploads `menu-photos/{menu_id}/{new-file}.webp`, updates the row, then deletes the previous object. When the menu row is gone, the photo row is gone with it. Delete the storage object too.

Search can show a new picture in about a minute. Home and saved products, about two minutes. A stall page or find page can keep the previous picture for up to an hour. Do not call the site to revalidate. That would rebuild pages on every upload.
