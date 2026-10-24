/**
 * PostgREST sends `.in()` filters in the request URL. One market roster is
 * 700 ids, which is a ~28KB URL. The gateway answers 400 and static generation
 * stops. Keep each filter well under that limit.
 */
export const ID_IN_CHUNK = 80;

export function chunkIds<T>(ids: readonly T[], size = ID_IN_CHUNK): T[][] {
  if (size < 1) throw new Error("Chunk size must be at least 1");
  const chunks: T[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

export async function selectInChunks<T>(
  ids: readonly string[],
  run: (slice: string[]) => PromiseLike<{
    data: T[] | null;
    error: { message?: string } | null;
  }>,
  fail: (error: { message?: string } | null) => never,
): Promise<T[]> {
  const rows: T[] = [];
  for (const slice of chunkIds(ids)) {
    const { data, error } = await run(slice);
    if (error) fail(error);
    if (data?.length) rows.push(...data);
  }
  return rows;
}
