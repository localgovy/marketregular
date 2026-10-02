import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptSaveResult } from "../src/lib/save-generation.ts";

test("a stale save response does not overwrite a newer toggle", () => {
  let latest = 0;
  const first = ++latest;
  const second = ++latest;
  assert.equal(acceptSaveResult(first, latest), false);
  assert.equal(acceptSaveResult(second, latest), true);
});
