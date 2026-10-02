import assert from "node:assert/strict";
import { test } from "node:test";
import { inSeason } from "../src/lib/schedule.ts";

const tz = "America/Toronto";

test("a date inside a season is in season", () => {
  const july = new Date("2026-07-15T16:00:00Z");
  const may = new Date("2026-05-01T16:00:00Z");
  const oct = new Date("2026-10-31T16:00:00Z");
  assert.equal(inSeason(july, "05-01", "10-31", tz), true);
  assert.equal(inSeason(may, "05-01", "10-31", tz), true);
  assert.equal(inSeason(oct, "05-01", "10-31", tz), true);
  assert.equal(inSeason(new Date("2026-11-01T17:00:00Z"), "05-01", "10-31", tz), false);
});

test("a season that wraps the new year includes winter and skips summer", () => {
  assert.equal(inSeason(new Date("2026-01-15T17:00:00Z"), "11-01", "03-31", tz), true);
  assert.equal(inSeason(new Date("2026-11-01T17:00:00Z"), "11-01", "03-31", tz), true);
  assert.equal(inSeason(new Date("2026-03-31T16:00:00Z"), "11-01", "03-31", tz), true);
  assert.equal(inSeason(new Date("2026-04-01T16:00:00Z"), "11-01", "03-31", tz), false);
  assert.equal(inSeason(new Date("2026-07-15T16:00:00Z"), "11-01", "03-31", tz), false);
  assert.equal(inSeason(new Date("2026-10-31T16:00:00Z"), "11-01", "03-31", tz), false);
});

test("a missing season bound is year-round", () => {
  const july = new Date("2026-07-15T16:00:00Z");
  assert.equal(inSeason(july, null, null, tz), true);
  assert.equal(inSeason(july, "05-01", null, tz), true);
  assert.equal(inSeason(july, null, "10-31", tz), true);
});
