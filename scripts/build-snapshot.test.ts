import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareNewest,
  filterFindMenus,
  postsWithinCaps,
  reviewsWithinCaps,
  selectChunkedListingReviews,
  VENDOR_POST_CAP,
  type FindAssignmentPick,
  type FindMenuPick,
  type ReviewPick,
} from "../src/lib/data/snapshot-select.ts";
import { buildSnapshotProblemsIn, findBuildSnapshotProblems } from "./check-build-snapshot.mjs";

function review(id: string, at: number, vendorId: string | null, marketId: string | null): ReviewPick {
  return {
    id,
    created_at: new Date(at).toISOString(),
    vendor_id: vendorId,
    market_id: marketId,
    flagged: false,
  };
}

test("in-memory listing notes match the chunked query, including after the snapshot cap", () => {
  const market = "market";
  const rows = [
    review("r1", 100, "A", market),
    review("r2", 90, "A", market),
    review("r3", 80, "A", market),
    review("r4", 70, "B", market),
    review("r5", 60, "C", "other"),
    review("r6", 110, "B", "other"),
    review("hidden", 200, "A", market),
  ];
  rows[6].flagged = true;

  const vendorIds = ["A", "B", "C"];
  const picked = selectChunkedListingReviews(rows, market, vendorIds, 2, 2).map((row) => row.id);
  assert.deepEqual(picked, ["r6", "r1"]);

  const trimmed = reviewsWithinCaps(rows, 2);
  const fromTrimmed = selectChunkedListingReviews(trimmed, market, vendorIds, 2, 2).map((row) => row.id);
  assert.deepEqual(fromTrimmed, picked);
  assert.equal(
    trimmed.some((row) => row.id === "hidden"),
    false,
  );
});

test("trimming reviews does not change a market's chunked notes", () => {
  const markets = ["m1", "m2", "m3"];
  const vendors = Array.from({ length: 12 }, (_, index) => `v${index}`);
  const rows: ReviewPick[] = [];
  let stamp = 1_700_000_000_000;
  for (let index = 0; index < 240; index += 1) {
    stamp += 60_000;
    rows.push(
      review(
        `n${index}`,
        stamp,
        vendors[index % vendors.length],
        markets[index % markets.length],
      ),
    );
  }
  const vendorIds = vendors.slice(0, 9);
  const full = selectChunkedListingReviews(rows, "m1", vendorIds).map((row) => row.id);
  const trimmed = selectChunkedListingReviews(reviewsWithinCaps(rows), "m1", vendorIds).map(
    (row) => row.id,
  );
  assert.deepEqual(trimmed, full);
});

test("the newest posts across halls survive the per-hall cap", () => {
  const rows = [];
  let stamp = 1_700_000_000_000;
  for (const marketId of ["a", "b", "c"]) {
    for (let index = 0; index < 180; index += 1) {
      stamp += 1000;
      rows.push({
        id: `${marketId}-${index}`,
        market_id: marketId,
        created_at: new Date(stamp).toISOString(),
      });
    }
  }
  const kept = postsWithinCaps(rows);
  const marketIds = ["a", "c"];
  const fromCaps = kept
    .filter((row) => marketIds.includes(row.market_id ?? ""))
    .sort(compareNewest)
    .slice(0, VENDOR_POST_CAP)
    .map((row) => row.id);
  const fromAll = rows
    .filter((row) => marketIds.includes(row.market_id))
    .sort(compareNewest)
    .slice(0, VENDOR_POST_CAP)
    .map((row) => row.id);
  assert.deepEqual(fromCaps, fromAll);
});

test("the production build still refuses a query per listing page", () => {
  assert.deepEqual(findBuildSnapshotProblems(), []);
  const broken = buildSnapshotProblemsIn((file) => {
    if (file === "src/lib/data/catalog.ts") return "export const getMarketBySlug = cache(async function getMarketBySlug() {\n  return null;\n})\n";
    return "staticGenerationMaxConcurrency: 1\nawait requireBuildSnapshot()\nexport const dynamic = \"force-dynamic\"\nrequireBuildSnapshot()";
  });
  assert.ok(broken.some((problem) => problem.includes("getMarketBySlug")));
});

test("find menus keep the page cap per slug slice and per classifier list", () => {
  const menus: FindMenuPick[] = [
    { id: "a1", name: "A1", product_category: "bread-and-bakery", product_slug: "a", price_cents: 100, vendor_id: "v" },
    { id: "a2", name: "A2", product_category: "bread-and-bakery", product_slug: "a", price_cents: 100, vendor_id: "v" },
    { id: "a3", name: "A3", product_category: "bread-and-bakery", product_slug: "a", price_cents: 100, vendor_id: "v" },
    { id: "b1", name: "B1", product_category: "bread-and-bakery", product_slug: "b", price_cents: 100, vendor_id: "v" },
    { id: "c1", name: "C1", product_category: "bread-and-bakery", product_slug: "c", price_cents: 100, vendor_id: "v" },
    { id: "d1", name: "D1", product_category: null, product_slug: null, price_cents: 100, vendor_id: "v" },
    { id: "m1", name: "M1", product_category: "pies-and-sweets", product_slug: "pie", price_cents: 100, vendor_id: "v" },
    { id: "m2", name: "M2", product_category: "pies-and-sweets", product_slug: "pie", price_cents: 100, vendor_id: "v" },
    { id: "m3", name: "M3", product_category: "pies-and-sweets", product_slug: "pie", price_cents: 100, vendor_id: "v" },
  ];
  const assignments: FindAssignmentPick[] = [
    { menu_id: "m2", classifier_slug: "sweet" },
    { menu_id: "m1", classifier_slug: "sweet" },
    { menu_id: "m3", classifier_slug: "sweet" },
    { menu_id: "m1", classifier_slug: "other" },
  ];
  const limits = { slice: 2, page: 2, pages: 1 };
  const rows = filterFindMenus(menus, assignments, ["a", "b", "c"], ["sweet"], limits);

  assert.deepEqual(
    rows.map((row) => row.id),
    ["a1", "a2", "c1", "m1", "m2"],
  );
});
