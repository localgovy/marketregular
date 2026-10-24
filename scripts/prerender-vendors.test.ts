import assert from "node:assert/strict";
import { test } from "node:test";
import { prerenderVendorSlugs } from "../src/lib/prerender-vendors.ts";

const vendors = [
  { id: "quiet", slug: "quiet-stall", review_count: 0 },
  { id: "busy", slug: "busy-stall", review_count: 9 },
  { id: "mid", slug: "mid-stall", review_count: 2 },
  { id: "also", slug: "also-stall", review_count: 0 },
];

test("the busiest stalls are the ones with more reviews", () => {
  const stalls = [
    { id: "quiet" },
    { id: "quiet" },
    { id: "mid" },
    { id: "busy" },
  ];
  assert.deepEqual(
    prerenderVendorSlugs(vendors, stalls, new Set(["quiet"]), 2),
    ["busy-stall", "mid-stall"],
  );
});

test("ties fall through to market count, a menu, then the slug", () => {
  const tied = [
    { id: "b", slug: "beta", review_count: 0 },
    { id: "a", slug: "alpha", review_count: 0 },
    { id: "c", slug: "cedar", review_count: 0 },
  ];
  const stalls = [{ id: "b" }, { id: "b" }];
  assert.deepEqual(prerenderVendorSlugs(tied, stalls, new Set(["c"]), 3), [
    "beta",
    "cedar",
    "alpha",
  ]);
});

test("the limit caps how many slugs are prerendered", () => {
  assert.equal(prerenderVendorSlugs(vendors, [], new Set(), 1).length, 1);
  assert.deepEqual(prerenderVendorSlugs(vendors, [], new Set(), 0), []);
});
