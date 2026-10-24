import assert from "node:assert/strict";
import { test } from "node:test";
import { chunkIds, ID_IN_CHUNK, selectInChunks } from "../src/lib/data/id-chunks.ts";

test("a 716-id roster is split into short filters", () => {
  const ids = Array.from({ length: 716 }, (_, index) =>
    `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`,
  );
  const chunks = chunkIds(ids);
  assert.equal(chunks.length, Math.ceil(716 / ID_IN_CHUNK));
  assert.ok(chunks.every((slice) => slice.length <= ID_IN_CHUNK));
  assert.equal(chunks.flat().length, 716);
  // 80 uuids stay far under the ~28KB URL that the gateway rejected.
  const longest = Math.max(
    ...chunks.map((slice) => slice.join(",").length),
  );
  assert.ok(longest < 4000);
});

test("selectInChunks keeps every row and stops on an error", async () => {
  const ids = ["a", "b", "c"];
  const seen: string[][] = [];
  const rows = await selectInChunks(
    ids,
    async (slice) => {
      seen.push(slice);
      return { data: slice.map((id) => ({ id })), error: null };
    },
    () => {
      throw new Error("unexpected");
    },
  );
  assert.deepEqual(rows, [{ id: "a" }, { id: "b" }, { id: "c" }]);
  assert.deepEqual(seen, [ids]);

  await assert.rejects(
    selectInChunks(
      ids,
      async () => ({ data: null, error: { message: "uri too long" } }),
      (error) => {
        throw new Error(error?.message || "failed");
      },
    ),
    /uri too long/,
  );
});
