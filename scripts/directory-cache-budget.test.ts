import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTORY_CACHE_BUDGET,
  DIRECTORY_FETCH_CAP,
  DIRECTORY_RANGE_CAP,
  budgetRangeResult,
  chunkBySerializedSize,
  joinDirectoryPages,
  loadBudgetedRange,
  rangesForCount,
  serializedBytes,
  windowFromSample,
  type BudgetedRange,
} from "../src/lib/directory-cache.ts";

test("serialized size counts utf-8 bytes", () => {
  assert.equal(serializedBytes("é") > serializedBytes("e"), true);
});

test("window from a sample stays inside the budget and the page cap", () => {
  assert.equal(windowFromSample([]), DIRECTORY_RANGE_CAP);
  const row = {
    id: "x".repeat(36),
    name: "Vendor",
    about: "a".repeat(172),
    tags: ["produce", "organic"],
  };
  const sample = Array.from({ length: 50 }, () => row);
  const window = windowFromSample(sample);
  const perRow = Math.ceil(serializedBytes(sample) / sample.length);
  assert.equal(window >= 1 && window <= DIRECTORY_RANGE_CAP, true);
  assert.equal(perRow * window <= DIRECTORY_CACHE_BUDGET, true);
});

test("ranges cover the count without passing the fetch cap", () => {
  assert.deepEqual(rangesForCount(0, 1000), []);
  assert.deepEqual(rangesForCount(2500, 1000), [
    { from: 0, to: 999 },
    { from: 1000, to: 1999 },
    { from: 2000, to: 2499 },
  ]);
  assert.equal(rangesForCount(DIRECTORY_FETCH_CAP + 5000, 1000).length, DIRECTORY_FETCH_CAP / 1000);
  const wide = rangesForCount(5000, 10_000);
  assert.equal(wide[0].to - wide[0].from + 1, DIRECTORY_RANGE_CAP);
});

test("a vendor-sized roster becomes several ranges", () => {
  const row = {
    id: "x".repeat(36),
    name: "Vendor name",
    about: "a".repeat(180),
    tags: ["produce"],
  };
  const sample = Array.from({ length: 50 }, () => row);
  const window = windowFromSample(sample);
  const ranges = rangesForCount(3260, window);
  assert.equal(ranges.length > 1, true);
  assert.equal(
    ranges.every((range) => range.to - range.from + 1 <= DIRECTORY_RANGE_CAP),
    true,
  );
});

test("serialized chunks stay under the budget and keep order", () => {
  const rows = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    about: "y".repeat(80),
  }));
  const budget = serializedBytes(rows.slice(0, 4));
  const chunks = chunkBySerializedSize(rows, budget);
  assert.equal(chunks.length > 1, true);
  assert.deepEqual(chunks.flat(), rows);
  for (const chunk of chunks) {
    if (chunk.length > 1) assert.equal(serializedBytes(chunk) <= budget, true);
  }
});

test("one value larger than the budget is left whole", () => {
  const rows = [{ id: "only", about: "z".repeat(200) }];
  const chunks = chunkBySerializedSize(rows, 16);
  assert.deepEqual(chunks, [rows]);
});

test("an over-budget range stores a marker and the halves", async () => {
  const rows = Array.from({ length: 8 }, (_, id) => ({ id, blob: "x".repeat(80) }));
  const budget = serializedBytes(rows.slice(0, 3));
  assert.equal(serializedBytes(rows) > budget, true);
  const memory = new Map<string, BudgetedRange<(typeof rows)[number]>>();

  async function load(from: number, to: number) {
    const key = `${from}:${to}`;
    const hit = memory.get(key);
    if (hit) return hit;
    const result = budgetRangeResult(rows.slice(from, to + 1), from, to, budget);
    memory.set(key, result);
    return result;
  }

  const first = await loadBudgetedRange(0, rows.length - 1, load, budget, "vendors");
  const stored = memory.size;
  const second = await loadBudgetedRange(0, rows.length - 1, load, budget, "vendors");

  assert.deepEqual(first, rows);
  assert.deepEqual(second, rows);
  assert.equal(memory.size, stored);
  const fat = memory.get(`0:${rows.length - 1}`);
  assert.equal(fat?.over, true);
  for (const entry of memory.values()) {
    assert.equal(serializedBytes(entry) <= budget, true);
  }
});

test("a repeated page is not appended", () => {
  const pages = [
    [{ id: "a" }, { id: "b" }],
    [{ id: "a" }, { id: "b" }],
    [{ id: "c" }],
  ];
  assert.deepEqual(
    joinDirectoryPages(pages, (row) => row.id).map((row) => row.id),
    ["a", "b"],
  );
});
