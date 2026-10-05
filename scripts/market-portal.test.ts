import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createdStallLogoObjectName,
  marketLogoObjectName,
  openDaysFromSchedules,
  parseMarketPortal,
  portalHours,
  portalSeason,
  rosterRemovalMessage,
} from "../src/lib/market-portal.ts";

const marketId = "55555555-5555-4555-8555-555555555555";
const vendorId = "44444444-4444-4444-8444-444444444444";

test("season is a pair of month-days or empty", () => {
  assert.deepEqual(portalSeason("", "  "), { start: "", end: "" });
  assert.deepEqual(portalSeason("05-10", "10-31"), { start: "05-10", end: "10-31" });
  assert.equal(portalSeason("05-10", ""), "bad");
  assert.equal(portalSeason("13-01", "10-31"), "bad");
  assert.equal(portalSeason("02-32", "03-01"), "bad");
  assert.equal(portalSeason("02-31", "03-01"), "bad");
  assert.equal(portalSeason("04-31", "05-01"), "bad");
  assert.deepEqual(portalSeason("02-29", "03-01"), { start: "02-29", end: "03-01" });
});

test("hours have to open before they close", () => {
  assert.deepEqual(portalHours("08:00", "14:00"), { opens: "08:00", closes: "14:00" });
  assert.equal(portalHours("14:00", "08:00"), "bad");
  assert.equal(portalHours("08:00", "08:00"), "bad");
  assert.equal(portalHours("8:00", "14:00"), "bad");
  assert.equal(portalHours("25:00", "26:00"), "bad");
});

test("logo object names stay inside this listing's folder", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  const marketUrl = `https://example.supabase.co/storage/v1/object/public/listing-marks/markets/${marketId}/mark.png`;
  assert.equal(marketLogoObjectName(marketId, marketUrl), `markets/${marketId}/mark.png`);
  assert.equal(
    marketLogoObjectName(marketId, marketUrl.replace("example.supabase.co", "evil.example")),
    null,
  );
  const stallUrl = `https://example.supabase.co/storage/v1/object/public/listing-marks/vendors/${vendorId}/mark.webp`;
  assert.equal(createdStallLogoObjectName(vendorId, stallUrl), `vendors/${vendorId}/mark.webp`);
  assert.equal(createdStallLogoObjectName(vendorId, marketUrl), null);
});

test("the market portal keeps contact off stalls the market cannot edit", () => {
  const listings = parseMarketPortal([
    {
      id: marketId,
      slug: "withrow",
      name: "Withrow",
      address: "725 Logan Ave",
      city: "Toronto",
      province: "ON",
      postal_code: "M4J 1M3",
      tags: ["produce"],
      status: "published",
      created_count: 1,
      schedules: [
        { id: "s1", weekday: 6, opens_at: "08:00", closes_at: "14:00", season_start: "05-01", season_end: "10-31", notes: "Rain or shine" },
        { id: "bad", weekday: 9, opens_at: "08:00", closes_at: "14:00" },
      ],
      stalls: [
        {
          vendor_id: vendorId,
          vendor_name: "River Fruit",
          vendor_slug: "river-fruit",
          stall: "A",
          days: [6, 6, 9],
          claimed: false,
          created_here: true,
          editable: true,
          phone: "416-555-0100",
          email: "stall@example.com",
          tags: ["produce"],
        },
        {
          vendor_id: "66666666-6666-4666-8666-666666666666",
          vendor_name: "Claimed Bread",
          vendor_slug: "claimed-bread",
          days: [6],
          claimed: true,
          created_here: false,
          editable: false,
          phone: "416-555-0199",
          email: "hidden@example.com",
        },
      ],
    },
  ]);
  assert.equal(listings.length, 1);
  const market = listings[0]!;
  assert.equal(market.schedules.length, 1);
  assert.deepEqual(openDaysFromSchedules(market.schedules), [6]);
  assert.equal(market.stalls[0]?.phone, "416-555-0100");
  assert.deepEqual(market.stalls[0]?.days, [6]);
  assert.equal(market.stalls[1]?.phone, null);
  assert.equal(market.stalls[1]?.email, null);
  assert.deepEqual(market.stalls[1]?.tags, []);
  assert.equal(parseMarketPortal("{").length, 0);
  assert.equal(parseMarketPortal("[]").length, 0);
});

test("removing a stall says whether the listing stayed", () => {
  assert.equal(rosterRemovalMessage("deleted"), "Removed. The listing is gone.");
  assert.match(rosterRemovalMessage("kept:order"), /order/);
  assert.match(rosterRemovalMessage("kept:market"), /another market/);
  assert.match(rosterRemovalMessage("kept:request"), /asked to run/);
  assert.match(rosterRemovalMessage("kept:review"), /review/);
  assert.match(rosterRemovalMessage("kept"), /listing stays/);
  assert.match(rosterRemovalMessage(null), /listing stays/);
});
