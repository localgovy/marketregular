/** Rank against text that is already lowercased. Same order as a fresh scan of each field. */
export function fieldRank(text: string, needle: string) {
  if (text === needle) return 0;
  if (text.startsWith(needle)) return 1;
  if (text.includes(needle)) return 2;
  return null;
}

export function bestFieldRank(fields: readonly string[], needle: string) {
  let best: number | null = null;
  for (const field of fields) {
    const rank = fieldRank(field, needle);
    if (rank == null) continue;
    if (best == null || rank < best) best = rank;
    if (best === 0) return 0;
  }
  return best;
}

/** Newline keeps a match from bridging two fields. */
export function searchBlob(fields: readonly string[]) {
  return fields.join("\n");
}

export function narrowBlobs<T extends { blob: string }>(rows: readonly T[], needle: string) {
  const next: T[] = [];
  for (const row of rows) {
    if (row.blob.includes(needle)) next.push(row);
  }
  return next;
}

/**
 * Bigram inverted index for substring search.
 * A query's consecutive pairs are looked up and their posting lists are
 * intersected, then every candidate is rechecked against the real fields.
 * That is the same plan Postgres uses for LIKE, with pairs instead of
 * trigrams because a search here starts at two characters. A trigram index
 * cannot narrow a two-character query. Rechecking is what keeps a pair that
 * is split across two fields from counting as a hit.
 */
export type BigramIndex = Map<string, Uint32Array>;

export function buildBigramIndex(docs: readonly (readonly string[])[]) {
  const buckets = new Map<string, number[]>();
  docs.forEach((fields, id) => {
    const seen = new Set<string>();
    for (const field of fields) {
      for (let index = 0; index < field.length - 1; index += 1) {
        seen.add(field.slice(index, index + 2));
      }
    }
    for (const gram of seen) {
      const list = buckets.get(gram);
      if (list) list.push(id);
      else buckets.set(gram, [id]);
    }
  });
  const index: BigramIndex = new Map();
  for (const [gram, ids] of buckets) index.set(gram, Uint32Array.from(ids));
  return index;
}

function intersectSorted(left: Uint32Array, right: Uint32Array) {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const a = left[i]!;
    const b = right[j]!;
    if (a === b) {
      out.push(a);
      i += 1;
      j += 1;
    } else if (a < b) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return Uint32Array.from(out);
}

/** Empty when nothing can match. Null when the query is too short to index. */
export function bigramCandidates(index: BigramIndex, needle: string) {
  if (needle.length < 2) return null;
  const grams: string[] = [];
  const seen = new Set<string>();
  for (let indexOf = 0; indexOf < needle.length - 1; indexOf += 1) {
    const gram = needle.slice(indexOf, indexOf + 2);
    if (seen.has(gram)) continue;
    seen.add(gram);
    grams.push(gram);
  }
  const lists: Uint32Array[] = [];
  for (const gram of grams) {
    const list = index.get(gram);
    if (!list) return new Uint32Array();
    lists.push(list);
  }
  lists.sort((a, b) => a.length - b.length);
  let matched = lists[0] ?? new Uint32Array();
  for (let listIndex = 1; listIndex < lists.length; listIndex += 1) {
    matched = intersectSorted(matched, lists[listIndex]!);
    if (matched.length === 0) break;
  }
  return matched;
}
