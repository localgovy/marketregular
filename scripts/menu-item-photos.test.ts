import assert from "node:assert/strict";
import { test } from "node:test";
import {
  menuItemPhotoUrl,
  publishedMenuSelectMissingPhoto,
} from "../src/lib/menu-item-photo-url.ts";
import { photoUrlsForPairs } from "../src/lib/menu-item-photo-match.ts";

const MENU = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FILE = `https://pxsndrlptceafhsxfays.supabase.co/storage/v1/object/public/menu-photos/${MENU}/hoops.webp`;

test("menu item photo urls stay on this bucket and this item", () => {
  assert.equal(menuItemPhotoUrl(FILE, MENU), FILE);
  assert.equal(menuItemPhotoUrl(` ${FILE} `, MENU), FILE);
  assert.equal(menuItemPhotoUrl(FILE.replace(/webp$/, "jpg"), MENU)?.endsWith(".jpg"), true);
  assert.equal(menuItemPhotoUrl(FILE.replace(/webp$/, "jpeg"), MENU)?.endsWith(".jpeg"), true);
  assert.equal(menuItemPhotoUrl(FILE.replace(/webp$/, "png"), MENU)?.endsWith(".png"), true);
  assert.equal(menuItemPhotoUrl(null), null);
  assert.equal(menuItemPhotoUrl(""), null);
  assert.equal(menuItemPhotoUrl(FILE, MENU.toUpperCase()), FILE);
  assert.equal(menuItemPhotoUrl(FILE, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), null);
  assert.equal(menuItemPhotoUrl(FILE.replace("/object/public/", "/render/image/public/")), null);
  assert.equal(menuItemPhotoUrl(FILE.replace("supabase.co", "example.com")), null);
  assert.equal(menuItemPhotoUrl(FILE.replace("hoops.webp", "../hoops.webp")), null);
  assert.equal(menuItemPhotoUrl(FILE.replace("hoops", "hoops item")), null);
  assert.equal(menuItemPhotoUrl(FILE.toUpperCase(), MENU), null);
});

test("saved pictures use the stored item name, and two different pictures for that name stay hidden", () => {
  const long = `${"Tomato".repeat(20)} extra`;
  const other = `${"Tomato".repeat(20)} other`;
  const photos = [
    { vendorSlug: "river-farm", name: long, imageUrl: "https://example.test/a.webp" },
    { vendorSlug: "river-farm", name: "Peas", imageUrl: "https://example.test/peas.webp" },
  ];
  const matched = photoUrlsForPairs(photos, [
    { vendorSlug: "river-farm", name: long.slice(0, 120) },
    { vendorSlug: "river-farm", name: "Peas" },
  ]);
  assert.equal(Object.values(matched).includes("https://example.test/a.webp"), true);
  assert.equal(Object.values(matched).includes("https://example.test/peas.webp"), true);

  const collided = photoUrlsForPairs(
    [
      ...photos,
      { vendorSlug: "river-farm", name: other, imageUrl: "https://example.test/b.webp" },
    ],
    [{ vendorSlug: "river-farm", name: long.slice(0, 120) }],
  );
  assert.equal(Object.keys(collided).length, 0);
  assert.deepEqual(photoUrlsForPairs(photos, [{ vendorSlug: "not a slug", name: "Peas" }]), {});
});

test("a missing image_url column is the signal to read the menu without a picture", () => {
  assert.equal(
    publishedMenuSelectMissingPhoto({
      code: "42703",
      message: 'column "image_url" does not exist',
    }),
    true,
  );
  assert.equal(
    publishedMenuSelectMissingPhoto({
      code: "PGRST204",
      message: "Could not find the 'image_url' column of 'published_menus' in the schema cache",
    }),
    true,
  );
  assert.equal(publishedMenuSelectMissingPhoto({ code: "42703", message: "column menu_section does not exist" }), false);
  assert.equal(publishedMenuSelectMissingPhoto(null), false);
});
