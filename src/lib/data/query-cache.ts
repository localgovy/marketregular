import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isProductionBuild } from "@/lib/build-phase";

/**
 * One copy of a directory read per process, and one copy per `next build`.
 * Next's data cache drops nested `unstable_cache` calls and will not keep an
 * entry workers can share once a payload is large, so each prerendered page
 * was issuing the same PostgREST reads again.
 */

const STORE = Symbol.for("marketregular.queryCache");
/** A build should reuse a dataset written earlier in the same run, not yesterday's file. */
const BUILD_DISK_TTL_MS = 60 * 60 * 1000;
const LOCK_STALE_MS = 30_000;
const LOCK_WAIT_MS = 120_000;

type Entry = {
  expires: number;
  value?: unknown;
  pending?: Promise<unknown>;
};

type Store = Map<string, Entry>;

export type QueryCodec<T> = {
  toJson: (value: T) => unknown;
  fromJson: (value: unknown) => T;
};

function memory(): Store {
  const host = globalThis as typeof globalThis & { [STORE]?: Store };
  if (!host[STORE]) host[STORE] = new Map();
  return host[STORE];
}

function diskDir() {
  if (process.env.QUERY_CACHE_DIR) return process.env.QUERY_CACHE_DIR;
  return path.join(process.cwd(), ".next", "cache", "directory-queries");
}

function diskPath(key: string) {
  // The query text is the cache key. Hash it so the filename stays under NAME_MAX.
  const name = createHash("sha256").update(key).digest("hex");
  return path.join(diskDir(), `${name}.json`);
}

/** Drop the in-process copies after a publish. The build disk cache is not used at runtime. */
export function clearQueryCache() {
  memory().clear();
}

async function readDisk<T>(key: string, codec?: QueryCodec<T>): Promise<T | undefined> {
  try {
    const file = diskPath(key);
    const info = await stat(file);
    if (Date.now() - info.mtimeMs > BUILD_DISK_TTL_MS) return undefined;
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    return codec ? codec.fromJson(parsed) : (parsed as T);
  } catch {
    return undefined;
  }
}

async function writeDisk<T>(key: string, value: T, codec?: QueryCodec<T>) {
  try {
    const file = diskPath(key);
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    const payload = codec ? codec.toJson(value) : value;
    await writeFile(tmp, JSON.stringify(payload));
    await rename(tmp, file);
  } catch (error) {
    console.error(
      "directory query cache",
      error instanceof Error ? error.message : "failed",
    );
  }
}

async function withDiskLock<T>(key: string, run: () => Promise<T>): Promise<T> {
  const lockPath = `${diskPath(key)}.lock`;
  await mkdir(path.dirname(lockPath), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      const handle = await open(lockPath, "wx");
      try {
        return await run();
      } finally {
        await handle.close();
        await unlink(lockPath).catch(() => {});
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      const info = await stat(lockPath).catch(() => null);
      if (info && Date.now() - info.mtimeMs > LOCK_STALE_MS) {
        await unlink(lockPath).catch(() => {});
        continue;
      }
      if (Date.now() - started > LOCK_WAIT_MS) {
        throw new Error("Timed out waiting for a shared directory read");
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  }
}

function cacheIoError(error: unknown) {
  const code = (error as NodeJS.ErrnoException).code;
  return code === "ENAMETOOLONG" || code === "ENOSPC" || code === "EACCES" || code === "EROFS";
}

async function resolveQuery<T>(
  key: string,
  load: () => Promise<T>,
  codec?: QueryCodec<T>,
): Promise<T> {
  if (!isProductionBuild()) return load();
  try {
    const cached = await readDisk(key, codec);
    if (cached !== undefined) return cached;
    return await withDiskLock(key, async () => {
      const again = await readDisk(key, codec);
      if (again !== undefined) return again;
      const value = await load();
      await writeDisk(key, value, codec);
      return value;
    });
  } catch (error) {
    if (!cacheIoError(error)) throw error;
    // The page can still render. The in-process memo keeps the fallback read.
    console.error(
      "directory query cache",
      error instanceof Error ? error.message : "failed",
    );
    return load();
  }
}

/**
 * Memoize one query for `ttlSeconds`. During `next build`, the value is also
 * written under `.next/cache` so every worker reuses the first read.
 */
export async function cachedQuery<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
  codec?: QueryCodec<T>,
): Promise<T> {
  const store = memory();
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now && hit.value !== undefined) return hit.value as T;
  if (hit?.pending) return hit.pending as Promise<T>;

  const pending = resolveQuery(key, load, codec);
  const entry: Entry = { expires: 0, pending };
  store.set(key, entry);
  try {
    const value = await pending;
    entry.value = value;
    entry.expires = Date.now() + ttlSeconds * 1000;
    entry.pending = undefined;
    return value;
  } catch (error) {
    if (store.get(key) === entry) store.delete(key);
    throw error;
  }
}
