import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { cachedQuery, clearQueryCache } from "../src/lib/data/query-cache.ts";

test("parallel callers share one in-flight read", async () => {
  clearQueryCache();
  let calls = 0;
  const key = "parallel-read";
  const load = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { ok: true };
  };
  const [first, second] = await Promise.all([
    cachedQuery(key, 60, load),
    cachedQuery(key, 60, load),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  const third = await cachedQuery(key, 60, load);
  assert.equal(calls, 1);
  assert.deepEqual(third, first);
});

test("a failed read is not kept", async () => {
  clearQueryCache();
  const key = "failed-read";
  await assert.rejects(cachedQuery(key, 60, async () => Promise.reject(new Error("nope"))));
  let calls = 0;
  const value = await cachedQuery(key, 60, async () => {
    calls += 1;
    return "ok";
  });
  assert.equal(value, "ok");
  assert.equal(calls, 1);
});

test("a build reuses the dataset from disk after the process memory is cleared", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "query-cache-"));
  const previousPhase = process.env.NEXT_PHASE;
  const previousDir = process.env.QUERY_CACHE_DIR;
  process.env.NEXT_PHASE = "phase-production-build";
  process.env.QUERY_CACHE_DIR = dir;
  clearQueryCache();
  try {
    let calls = 0;
    const key = "published_markets|select=id|status=eq.published";
    const first = await cachedQuery(key, 60, async () => {
      calls += 1;
      return [{ id: "market-1" }];
    });
    assert.deepEqual(first, [{ id: "market-1" }]);
    clearQueryCache();
    const second = await cachedQuery(key, 60, async () => {
      calls += 1;
      return [{ id: "market-2" }];
    });
    assert.equal(calls, 1);
    assert.deepEqual(second, [{ id: "market-1" }]);
  } finally {
    clearQueryCache();
    if (previousPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = previousPhase;
    if (previousDir === undefined) delete process.env.QUERY_CACHE_DIR;
    else process.env.QUERY_CACHE_DIR = previousDir;
    await rm(dir, { recursive: true, force: true });
  }
});
