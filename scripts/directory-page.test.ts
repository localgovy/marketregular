import assert from "node:assert/strict";
import { test } from "node:test";
import { nextDirectoryPage } from "../src/lib/directory-page.ts";

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

test("next page reports more when unseen rows remain past the page", () => {
  const rows = ["new-1", "new-2", "new-3", "shown-1"].map((id) => ({ id }));
  const { page, done } = nextDirectoryPage(rows, new Set(["shown-1"]), 2);
  assert.deepEqual(
    page.map((row) => row.id),
    ["new-1", "new-2"],
  );
  assert.equal(done, false);
});
