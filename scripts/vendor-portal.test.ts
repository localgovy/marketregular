import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dollarsFromCents,
  normalizePortalTag,
  ownedLogoObjectName,
  parseVendorPortal,
  priceCents,
} from "../src/lib/vendor-portal.ts";

const vendorId = "11111111-1111-4111-8111-111111111111";

test("portal tags keep letters, numbers, and single hyphens", () => {
  assert.equal(normalizePortalTag("  Jamaican "), "jamaican");
  assert.equal(normalizePortalTag("gluten free"), "gluten-free");
  assert.equal(normalizePortalTag("-nope"), null);
  assert.equal(normalizePortalTag("a--b"), null);
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
});
