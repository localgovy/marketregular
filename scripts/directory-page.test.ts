import assert from "node:assert/strict";
import { test } from "node:test";
import { nextDirectoryPage } from "../src/lib/directory-page.ts";
import { sortDirectoryMarkets } from "../src/lib/directory-sort.ts";
import type { Market } from "../src/types/database.ts";
import type { ScheduleRow } from "../src/lib/schedule.ts";

test("next page continues a stable list", () => {
  const rows = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  const { page, done } = nextDirectoryPage(rows, new Set(["a", "b"]), 2);
  assert.deepEqual(
    page.map((row) => row.id),
    ["c", "d"],
  );
  assert.equal(done, false);
});

test("next page still returns unseen rows when a fresh sort shifts the old page onto the offset", () => {
  // Visitor already has the cached first page. A later sort put newly opened
  // markets in front, so slice(shown.length) is exactly the rows on screen.
  const rows = ["new-1", "new-2", "shown-1", "shown-2"].map((id) => ({ id }));
  const seen = new Set(["shown-1", "shown-2"]);
  assert.deepEqual(
    rows.slice(seen.size, seen.size + 2).map((row) => row.id),
    ["shown-1", "shown-2"],
  );
  const { page, done } = nextDirectoryPage(rows, seen, 2);
  assert.deepEqual(
    page.map((row) => row.id),
    ["new-1", "new-2"],
  );
  assert.equal(done, true);
});

test("next page is done when every remaining row is already shown", () => {
  const rows = ["a", "b", "a"].map((id) => ({ id }));
  const { page, done } = nextDirectoryPage(rows, new Set(["a", "b"]), 10);
  assert.deepEqual(page, []);
  assert.equal(done, true);
});

test("bounded directory keys ignore tag order and skip free text", async () => {
  const { boundedDirectoryKey, directoryViewHref, marketsHref, marketsSearchFromSearchParams } =
    await import("../src/lib/find-paths.ts");
  const produce = boundedDirectoryKey({ tags: ["produce"] });
  const reversed = boundedDirectoryKey({ tags: ["bakery", "produce"] });
  const same = boundedDirectoryKey({ tags: ["produce", "bakery"] });
  assert.equal(produce !== null, true);
  assert.equal(reversed, same);
  assert.equal(boundedDirectoryKey({ q: "honey", tags: ["produce"] }), null);
  assert.equal(boundedDirectoryKey({ lat: "43.7", lng: "-79.4", tags: ["produce"] }), null);
  assert.equal(boundedDirectoryKey({ tags: ["not-a-real-tag"] }), null);
  assert.equal(boundedDirectoryKey({ tags: ["produce"], sort: "next" }), produce);
  const search = marketsSearchFromSearchParams(new URLSearchParams("tag=bakery&tag=produce"));
  const page = marketsHref(search);
  const view = directoryViewHref(search);
  assert.equal(page, "/markets?tag=bakery&tag=produce");
  assert.equal(view, "/api/directory?tag=bakery&tag=produce");
  assert.equal(boundedDirectoryKey(search), same);
});

test("next-open sort uses the clock it is given, not the moment the schedules were loaded", () => {
  const markets = [
    { id: "friday", name: "Friday Hall", province: "ON" },
    { id: "saturday", name: "Saturday Hall", province: "ON" },
  ] as Market[];
  const schedules = new Map<string, ScheduleRow[]>([
    [
      "friday",
      [
        {
          weekday: 5,
          opens_at: "08:00",
          closes_at: "14:00",
          season_start: "06-11",
          season_end: "10-23",
        },
      ],
    ],
    [
      "saturday",
      [
        {
          weekday: 6,
          opens_at: "07:00",
          closes_at: "14:00",
          season_start: null,
          season_end: null,
        },
      ],
    ],
  ]);
  const orderAt = (iso: string) =>
    sortDirectoryMarkets(markets, "next", {
      now: new Date(iso),
      schedulesFor: (id) => schedules.get(id) ?? [],
    }).map((market) => market.id);

  // Friday morning: the Friday hall is open, so it leads.
  assert.deepEqual(orderAt("2026-10-23T14:00:00.000Z"), ["friday", "saturday"]);
  // Friday evening, after that hall's last day of the season: Saturday is next.
  assert.deepEqual(orderAt("2026-10-24T00:30:00.000Z"), ["saturday", "friday"]);
});

test("next page reports more when unseen rows remain past the page", () => {
  const rows = ["new-1", "new-2", "new-3", "shown-1"].map((id) => ({ id }));
  const { page, done } = nextDirectoryPage(rows, new Set(["shown-1"]), 2);
  assert.deepEqual(
    page.map((row) => row.id),
    ["new-1", "new-2"],
  );
  assert.equal(done, false);
});
