/** Data-cache tag for the published markets, vendors, stalls, schedules, and menu ids. */
export const DIRECTORY_TAG = "directory";

/** Shared lifetime for directory snapshots, including filtered first pages. */
export const DIRECTORY_REVALIDATE_SECONDS = 120;

/**
 * Next refuses to store one data-cache entry over 2MB.
 * Stay under this so the cache wrapper still fits, and so a growing roster
 * adds another range instead of silently refetching the whole list.
 */
export const DIRECTORY_CACHE_BUDGET = 1_250_000;

/** PostgREST returns at most this many rows in one response. */
export const DIRECTORY_RANGE_CAP = 1000;

/** Stop a view that ignores offset from being followed until the function is killed. */
export const DIRECTORY_FETCH_CAP = 40_000;

const splitLogs = new Set<string>();

export function serializedBytes(value: unknown) {
  const json = JSON.stringify(value);
  if (json === undefined) return 0;
  return new TextEncoder().encode(json).length;
}

/** How many rows fit in one cache entry, from a sample of the same shape that will be stored. */
export function windowFromSample(
  sample: readonly unknown[],
  budget = DIRECTORY_CACHE_BUDGET,
  cap = DIRECTORY_RANGE_CAP,
) {
  const limit = Math.max(1, cap);
  if (!sample.length) return limit;
  const perRow = Math.max(1, Math.ceil(serializedBytes(sample) / sample.length));
  return Math.min(limit, Math.max(1, Math.floor(budget / perRow)));
}

export type RowRange = { from: number; to: number };

/** Inclusive offsets. The window is never wider than one PostgREST page. */
export function rangesForCount(
  count: number,
  window: number,
  maxRows = DIRECTORY_FETCH_CAP,
  cap = DIRECTORY_RANGE_CAP,
) {
  if (!Number.isFinite(count) || count <= 0) return [];
  const size = Math.min(Math.max(1, cap), Math.max(1, Number.isFinite(window) ? Math.floor(window) : cap));
  const total = Math.min(Math.floor(count), Math.max(0, maxRows));
  const ranges: RowRange[] = [];
  for (let from = 0; from < total; from += size) {
    ranges.push({ from, to: Math.min(total, from + size) - 1 });
  }
  return ranges;
}

/**
 * Split a list so each piece's JSON stays under the budget.
 * One value that is itself over the budget stays alone; a range cannot split it further.
 */
export function chunkBySerializedSize<T>(rows: readonly T[], budget = DIRECTORY_CACHE_BUDGET) {
  if (!rows.length) return [];
  const chunks: T[][] = [];
  let current: T[] = [];
  let size = 2;
  for (const row of rows) {
    const rowBytes = serializedBytes(row);
    const next = size + rowBytes + (current.length ? 1 : 0);
    if (current.length > 0 && next > budget) {
      chunks.push(current);
      current = [row];
      size = 2 + rowBytes;
      continue;
    }
    current.push(row);
    size = next;
  }
  chunks.push(current);
  return chunks;
}

export type BudgetedRange<T> = { over: true; bytes: number } | { over: false; rows: T[] };

/**
 * Cache this instead of the rows when the range is over budget.
 * A single row is returned anyway: there is no smaller range to store.
 */
export function budgetRangeResult<T>(
  rows: T[],
  from: number,
  to: number,
  budget = DIRECTORY_CACHE_BUDGET,
): BudgetedRange<T> {
  const bytes = serializedBytes(rows);
  if (bytes > budget && to > from) return { over: true, bytes };
  return { over: false, rows };
}

function warnSplit(label: string, from: number, to: number, bytes: number) {
  const key = `${label}:${from}:${to}`;
  if (splitLogs.has(key)) return;
  splitLogs.add(key);
  console.warn("directory cache window over budget", { label, from, to, bytes });
}

/**
 * Load a from-to range. When the stored result says the rows do not fit,
 * that payload is not the rows — load and cache the two halves instead.
 */
export async function loadBudgetedRange<T>(
  from: number,
  to: number,
  load: (from: number, to: number) => Promise<BudgetedRange<T>>,
  budget = DIRECTORY_CACHE_BUDGET,
  label = "directory",
): Promise<T[]> {
  if (to < from) return [];
  const result = await load(from, to);
  if (!result.over) return result.rows;
  if (to <= from) return [];
  warnSplit(label, from, to, result.bytes);
  const mid = from + Math.floor((to - from) / 2);
  const [left, right] = await Promise.all([
    loadBudgetedRange(from, mid, load, budget, label),
    loadBudgetedRange(mid + 1, to, load, budget, label),
  ]);
  return [...left, ...right];
}

/** Drop a repeated first row so a view that ignores offset cannot loop. */
export function joinDirectoryPages<T>(pages: readonly T[][], idOf: (row: T) => string) {
  const rows: T[] = [];
  let previousHead = "";
  for (const page of pages) {
    const head = page.length ? idOf(page[0]) : "";
    if (rows.length && head && head === previousHead) break;
    previousHead = head;
    rows.push(...page);
  }
  return rows;
}
