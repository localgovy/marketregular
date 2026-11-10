import assert from "node:assert/strict";
import { test } from "node:test";
import { applyVendorClock } from "../src/lib/vendor-atlas-clock.ts";
import type { VendorAtlasData } from "../src/lib/vendor-atlas-data.ts";

const renderedAt = Date.parse("2026-11-11T15:00:00Z");

function stallPage(): VendorAtlasData {
  return {
    nowMs: renderedAt,
    todayWeekday: 0,
    clock: {
      renderedAt,
      halls: {
        m1: {
          province: "ON",
          schedules: [
            { weekday: 6, opens_at: "08:00", closes_at: "13:00", season_start: null, season_end: null },
          ],
        },
      },
      peerHalls: {
        m2: {
          province: "ON",
          schedules: [
            { weekday: 3, opens_at: "09:00", closes_at: "14:00", season_start: null, season_end: null },
          ],
        },
      },
      peerStalls: { p1: [{ marketId: "m2", days: [3] }] },
    },
    vendor: {
      badge: "On the schedule",
      openNow: false,
      sellingToday: false,
      nextSessionSummary: null,
    },
    markets: [
      {
        id: "m1",
        slug: "saturday-hall",
        name: "Saturday Hall",
        province: "ON",
        days: [6],
        hours: [],
        openNow: false,
        inSeason: false,
        nextOpen: "",
      },
    ],
    similarVendors: [
      { id: "p1", badge: "On the schedule", markets: [{ name: "Wednesday Hall", slug: "wednesday-hall", hours: [] }] },
    ],
  } as unknown as VendorAtlasData;
}

test("a stall open at its Saturday market reads selling now on Saturday morning", () => {
  const data = applyVendorClock(stallPage(), new Date("2026-11-14T15:00:00Z"));
  assert.equal(data.vendor.badge, "Selling now");
  assert.equal(data.vendor.openNow, true);
  assert.equal(data.markets[0].openNow, true);
  assert.equal(data.markets[0].hours[0]?.day, "Sat");
  assert.match(data.vendor.nextSessionSummary ?? "", /^Saturday Hall · Sat /);
  assert.equal(data.similarVendors[0].badge, "On the schedule");
});

test("the same cached page reads this weekend on a Wednesday, and its peer is selling", () => {
  const data = applyVendorClock(stallPage(), new Date("2026-11-11T15:00:00Z"));
  assert.equal(data.vendor.badge, "Selling this weekend");
  assert.equal(data.vendor.openNow, false);
  assert.equal(data.markets[0].openNow, false);
  assert.equal(data.similarVendors[0].badge, "Selling now");
  assert.equal(data.similarVendors[0].markets[0].hours[0]?.day, "Wed");
});

test("applying the render clock twice gives the page the server rendered", () => {
  const once = applyVendorClock(stallPage(), new Date(renderedAt));
  assert.deepEqual(applyVendorClock(once, new Date(renderedAt)), once);
  assert.equal(once.markets[0].slug, "saturday-hall");
});
