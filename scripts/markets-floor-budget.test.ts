import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DIRECTORY_CACHE_BUDGET, serializedBytes } from "../src/lib/directory-cache.ts";
import { FLOOR_TAXONOMY_PAGE_CAP, fitFloorTaxonomy } from "../src/lib/markets-floor-budget.ts";
import { floorQueryFromSearch } from "../src/lib/markets-floor-query.ts";
import type { FloorTaxonomy } from "../src/lib/markets-floor-types.ts";

test("markets floor taxonomy cannot scan without a cap", () => {
  assert.ok(FLOOR_TAXONOMY_PAGE_CAP <= 80);
  assert.ok(FLOOR_TAXONOMY_PAGE_CAP >= 40);
});

test("an oversized taxonomy is shrunk under the data-cache budget", () => {
  const entry: FloorTaxonomy = {
    categories: ["bread-and-bakery"],
    origins: ["italian"],
    diets: [],
    production: ["organic"],
    samples: [
      { name: "x".repeat(400), href: "/find/bread-toronto", priceCents: 900, category: "bread-and-bakery" },
      { name: "y".repeat(400), href: "/find/sourdough-toronto", priceCents: 800, category: "bread-and-bakery" },
    ],
  };
  const taxonomy: Record<string, FloorTaxonomy> = {};
  for (let index = 0; index < 4000; index += 1) taxonomy[`vendor-${index}`] = entry;
  assert.ok(serializedBytes(taxonomy) > DIRECTORY_CACHE_BUDGET);
  const fitted = fitFloorTaxonomy(taxonomy);
  assert.ok(serializedBytes(fitted) <= DIRECTORY_CACHE_BUDGET);
});

test("a hostile markets query cannot widen the directory read", () => {
  const query = floorQueryFromSearch(
    {
      q: "h".repeat(5000),
      tags: Array.from({ length: 100 }, (_, index) => `tag-${index}`),
      areas: ["a".repeat(5000)],
      lat: "999",
      lng: "999",
    },
    [],
  );
  assert.ok(query.q.length <= 80);
  assert.ok(query.categoryTags.length <= 8);
  assert.equal(query.area, null);
  assert.equal(query.near, null);
});

test("the live markets page does not load the preview fan-out", () => {
  const page = readFileSync(new URL("../src/app/markets/(index)/page.tsx", import.meta.url), "utf8");
  assert.equal(page.includes("loadHomePreviewData"), false);
  assert.equal(page.includes("loadMarketsPreviewData"), false);
  assert.equal(page.includes("loadMarketsFloorView"), true);
});

test("a markets search URL does not get its own server render", () => {
  const page = readFileSync(new URL("../src/app/markets/(index)/page.tsx", import.meta.url), "utf8");
  const view = readFileSync(new URL("../src/lib/markets-floor-data.ts", import.meta.url), "utf8");
  const assembled = view.slice(view.indexOf("export async function loadMarketsFloorView"));
  assert.equal(page.includes("searchParams"), false);
  assert.equal(page.includes("formKey"), false);
  assert.equal(page.includes("unstable_cache"), false);
  assert.match(page, /export const revalidate = DIRECTORY_REVALIDATE_SECONDS/);
  assert.equal(assembled.includes("unstable_cache"), false);
});
