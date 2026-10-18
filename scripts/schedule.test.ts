import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareScheduleRows,
  formatSchedule,
  formatSeasonRange,
  inSeason,
  sortScheduleRows,
} from "../src/lib/schedule.ts";

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

test("a season that starts and ends on the same day is one date", () => {
  assert.equal(formatSeasonRange("12-06", "12-06"), "Dec 6");
  assert.equal(formatSeasonRange("05-01", "10-31"), "May 1 to Oct 31");
  assert.equal(formatSeasonRange("12-04", "12-06"), "Dec 4 to Dec 6");
  assert.equal(formatSeasonRange(null, null), "Year-round");
  assert.equal(formatSeasonRange("05-01", null), "From May 1");
  assert.equal(formatSeasonRange(null, "10-31"), "Until Oct 31");
  const oneDay = formatSchedule({
    weekday: 0,
    opens_at: "10:00",
    closes_at: "15:00",
    season_start: "12-06",
    season_end: "12-06",
    notes: "Rain or shine",
  });
  assert.equal(oneDay.day, "Sunday");
  assert.equal(oneDay.detail, "Dec 6. Rain or shine");
});

test("schedule rows sort by season start, then weekday", () => {
  const friday = row(5, "12-04", "12-04", "09:00");
  const saturday = row(6, "12-05", "12-05", "09:00");
  const sunday = row(0, "12-06", "12-06", "10:00");
  const ordered = sortScheduleRows([sunday, friday, saturday]);
  assert.deepEqual(
    ordered.map((item) => item.weekday),
    [5, 6, 0],
  );
  assert.deepEqual(
    ordered.map((item) => formatSeasonRange(item.season_start, item.season_end)),
    ["Dec 4", "Dec 5", "Dec 6"],
  );

  const weekly = sortScheduleRows([
    row(6, "05-01", "10-31", "08:00"),
    row(0, "05-01", "10-31", "09:00"),
  ]);
  assert.deepEqual(
    weekly.map((item) => item.weekday),
    [0, 6],
  );

  const yearRound = sortScheduleRows([row(6, null, null, "08:00"), row(0, null, null, "09:00")]);
  assert.deepEqual(
    yearRound.map((item) => item.weekday),
    [0, 6],
  );

  const mixed = sortScheduleRows([row(0, null, null, "09:00"), row(5, "12-04", "12-04", "09:00")]);
  assert.equal(mixed[0]?.season_start, "12-04");
  assert.equal(mixed[1]?.season_start, null);

  const morning = row(6, "05-01", "10-31", "08:00");
  const afternoon = row(6, "05-01", "10-31", "12:00");
  assert.ok(compareScheduleRows(afternoon, morning) > 0);
  assert.deepEqual(
    sortScheduleRows([afternoon, morning]).map((item) => item.opens_at),
    ["08:00", "12:00"],
  );
});

function row(weekday: number, season_start: string | null, season_end: string | null, opens_at: string) {
  return {
    weekday,
    opens_at,
    closes_at: "14:00",
    season_start,
    season_end,
  };
}
