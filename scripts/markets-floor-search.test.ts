import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bestFieldRank,
  bigramCandidates,
  buildBigramIndex,
  fieldRank,
  narrowBlobs,
  searchBlob,
} from "../src/lib/markets-floor-search.ts";

test("field rank keeps exact, prefix, and contains in that order", () => {
  assert.equal(fieldRank("honey", "honey"), 0);
  assert.equal(fieldRank("honey world", "honey"), 1);
  assert.equal(fieldRank("wildflower honey", "honey"), 2);
  assert.equal(fieldRank("bread", "honey"), null);
  assert.equal(bestFieldRank(["bread and bakery", "pies and sweets"], "pies"), 1);
  assert.equal(bestFieldRank(["bread and bakery", "pies and sweets"], "and"), 2);
});

test("a longer query only needs the shorter query's matches", () => {
  const rows = [
    { blob: searchBlob(["honey world", "honey"]) },
    { blob: searchBlob(["wildflower honey"]) },
    { blob: searchBlob(["bread"]) },
    { blob: searchBlob(["honest dumplings"]) },
  ];
  const hone = narrowBlobs(rows, "hone");
  const honey = narrowBlobs(hone, "honey");
  assert.deepEqual(honey, narrowBlobs(rows, "honey"));
  assert.equal(honey.length, 2);
  assert.equal(narrowBlobs(rows, "bread").length, 1);
});

test("bigram candidates never miss a substring and recheck drops split fields", () => {
  const docs = [
    ["honey world", "bread"],
    ["wildflower honey"],
    ["honest dumplings"],
    ["bread and bakery"],
    ["future bakery"],
  ];
  const index = buildBigramIndex(docs);
  for (const needle of ["ho", "hon", "hone", "honey", "bread", "ey", "ba"]) {
    const ids = bigramCandidates(index, needle);
    assert.ok(ids);
    const found = new Set(ids);
    docs.forEach((fields, id) => {
      const hit = fields.some((field) => field.includes(needle));
      if (hit) assert.equal(found.has(id), true, `${needle} missed doc ${id}`);
    });
    for (const id of ids) {
      const fields = docs[id] ?? [];
      const hit = fields.some((field) => field.includes(needle));
      if (!hit) assert.equal(fields.some((field) => field.includes(needle)), false);
    }
  }
  const split = bigramCandidates(index, "world bread");
  assert.ok(split);
  assert.equal(split.length, 0);
  assert.equal(bigramCandidates(index, "h"), null);
});

test("a needle cannot match by bridging two fields", () => {
  const blob = searchBlob(["honey world", "bread"]);
  assert.equal(blob.includes("world bread"), false);
  assert.equal(blob.includes("honey"), true);
});
