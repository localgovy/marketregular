import assert from "node:assert/strict";
import { test } from "node:test";
import {
  pendingToRestore,
  restorePendingSave,
  stashPendingSave,
  takePendingSave,
} from "../src/lib/pending-save.ts";

const memory = new Map<string, string>();

globalThis.window = {
  sessionStorage: {
    getItem(key: string) {
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    },
  },
} as Window & typeof globalThis;

test("a failed persist puts the pending save back", () => {
  const pending = { kind: "market" as const, slug: "wychwood-barns" };
  assert.equal(pendingToRestore(pending, { markets: ["wychwood-barns"] }), null);
  assert.deepEqual(pendingToRestore(pending, null), pending);

  stashPendingSave(pending);
  const taken = takePendingSave();
  assert.deepEqual(taken, pending);
  assert.equal(takePendingSave(), null);

  restorePendingSave(pending);
  assert.deepEqual(takePendingSave(), pending);
});
