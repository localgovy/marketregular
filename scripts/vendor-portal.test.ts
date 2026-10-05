import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dollarsFromCents,
  dayHoursLabel,
  imageKind,
  normalizePortalTag,
  ownedLogoObjectName,
  parseVendorPortal,
  vendorPublicPageExists,
  portalListingHref,
  portalSocialHref,
  priceCents,
} from "../src/lib/vendor-portal.ts";

const vendorId = "11111111-1111-4111-8111-111111111111";

test("portal tags keep letters, numbers, and single hyphens", () => {
  assert.equal(normalizePortalTag("  Jamaican "), "jamaican");
  assert.equal(normalizePortalTag("gluten free"), "gluten-free");
  assert.equal(normalizePortalTag("-nope"), null);
  assert.equal(normalizePortalTag("a--b"), null);
});

test("listing links become a public http address or stay empty", () => {
  assert.equal(portalListingHref("instagram.com/river"), "https://instagram.com/river");
  assert.equal(portalListingHref("  https://example.com/stall  "), "https://example.com/stall");
  assert.equal(portalListingHref(""), null);
  assert.equal(portalListingHref("   "), null);
  assert.equal(portalListingHref("javascript:alert(1)"), "bad");
  assert.equal(portalListingHref("https://user:pass@example.com"), "bad");
  assert.equal(portalListingHref("https://river"), "bad");
  assert.equal(portalListingHref("@river"), "bad");
});

test("a social handle becomes that network's profile", () => {
  assert.equal(portalSocialHref("instagram", "@river"), "https://www.instagram.com/river");
  assert.equal(portalSocialHref("instagram", "river.fruit"), "https://www.instagram.com/river.fruit");
  assert.equal(portalSocialHref("tiktok", "river"), "https://www.tiktok.com/@river");
  assert.equal(portalSocialHref("facebook", "River Fruit"), "bad");
  assert.equal(portalSocialHref("instagram", "https://instagram.com/river"), "https://instagram.com/river");
  assert.equal(portalSocialHref("instagram", ""), null);
  assert.equal(portalSocialHref("instagram", "javascript:alert(1)"), "bad");
});

test("prices stay in cents", () => {
  assert.equal(priceCents(""), null);
  assert.equal(priceCents("8.50"), 850);
  assert.equal(priceCents("8.5"), 850);
  assert.equal(priceCents("0"), 0);
  assert.equal(priceCents("-1"), "bad");
  assert.equal(priceCents("10.999"), "bad");
  assert.equal(dollarsFromCents(850), "8.50");
  assert.equal(dollarsFromCents(800), "8");
  assert.equal(dollarsFromCents(null), "");
});

test("a logo is recognized from its bytes", () => {
  assert.equal(imageKind(Uint8Array.of(0xff, 0xd8, 0xff, 0x00, 0, 0, 0, 0, 0, 0, 0, 0)), "jpg");
  assert.equal(
    imageKind(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0)),
    "png",
  );
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  assert.equal(imageKind(webp), "webp");
  assert.equal(imageKind(Uint8Array.of(0x3c, 0x73, 0x76, 0x67, 0, 0, 0, 0, 0, 0, 0, 0)), null);
  assert.equal(imageKind(Uint8Array.of(0xff, 0xd8)), null);
});

test("logo urls stay inside this stall's folder", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  const url = `https://example.supabase.co/storage/v1/object/public/listing-marks/vendors/${vendorId}/mark.png`;
  assert.equal(ownedLogoObjectName(vendorId, url), `vendors/${vendorId}/mark.png`);
  assert.equal(
    ownedLogoObjectName(vendorId, "https://evil.example/storage/v1/object/public/listing-marks/vendors/" + vendorId + "/mark.png"),
    null,
  );
  assert.equal(
    ownedLogoObjectName("22222222-2222-4222-8222-222222222222", url),
    null,
  );
});

test("portal payload keeps menus and stall days", () => {
  const listings = parseVendorPortal([
    {
      id: vendorId,
      slug: "river-fruit",
      name: "River Fruit",
      about: null,
      website: null,
      instagram: null,
      tiktok: null,
      facebook: null,
      phone: "4165550100",
      email: "stall@example.com",
      logo_url: null,
      tags: ["produce"],
      status: "published",
      menus: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "Peaches",
          description: null,
          price_cents: 500,
          season: "August",
          dietary: [],
        },
      ],
      stalls: [
        {
          market_id: "44444444-4444-4444-8444-444444444444",
          market_name: "Withrow",
          market_slug: "withrow",
          market_city: "Toronto",
          stall: "A3",
          days: [6],
          open_days: [6],
          hours: [{ weekday: 6, opens_at: "08:00", closes_at: "13:00" }],
        },
      ],
    },
    { id: "nope" },
  ]);
  assert.equal(listings.length, 1);
  assert.equal(listings[0]?.menus[0]?.price_cents, 500);
  assert.deepEqual(listings[0]?.stalls[0]?.days, [6]);
  assert.equal(listings[0]?.phone, "4165550100");
  assert.equal(listings[0]?.stalls[0]?.hours[0]?.season_start, null);
});

test("stall days show each season, and the public page needs a hall", () => {
  const label = dayHoursLabel(
    [
      { weekday: 6, opens_at: "08:00", closes_at: "14:00", season_start: "05-01", season_end: "10-31" },
      { weekday: 6, opens_at: "09:00", closes_at: "13:00", season_start: "11-01", season_end: "04-30", notes: "Indoor" },
    ],
    6,
  );
  assert.match(label, /May 1 to Oct 31/);
  assert.match(label, /Nov 1 to Apr 30/);
  assert.match(label, /Indoor/);
  assert.equal(vendorPublicPageExists("published", 0, false), false);
  assert.equal(vendorPublicPageExists("published", 0, true), true);
  assert.equal(vendorPublicPageExists("published", 1, false), true);
  assert.equal(vendorPublicPageExists("draft", 2, false), false);
});
