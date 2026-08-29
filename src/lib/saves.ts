import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

export type SaveKind = "market" | "vendor";

export type Saves = {
  markets: string[];
  vendors: string[];
};

export const EMPTY_SAVES: Saves = { markets: [], vendors: [] };

const KEY = "mr-saves";
const LEGACY_KEY = "mr-keeps";
const listeners = new Set<() => void>();
let snapshot: Saves = cloneEmpty();
let booted = false;

function cloneEmpty(): Saves {
  return { markets: [], vendors: [] };
}

function clone(saves: Saves): Saves {
  return { markets: [...saves.markets], vendors: [...saves.vendors] };
}

function parse(raw: string | null): Saves {
  if (!raw) return clone(EMPTY_SAVES);
  try {
    const parsed = JSON.parse(raw) as Partial<Saves>;
    return {
      markets: Array.isArray(parsed.markets)
        ? parsed.markets.filter((item): item is string => typeof item === "string")
        : [],
      vendors: Array.isArray(parsed.vendors)
        ? parsed.vendors.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return clone(EMPTY_SAVES);
  }
}

function emit(next: Saves) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  listeners.forEach((fn) => fn());
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== LEGACY_KEY) return;
  snapshot = documentHasAuthCookie() ? parse(event.newValue) : clone(EMPTY_SAVES);
  listeners.forEach((fn) => fn());
}

/** After mount, so the first client paint still matches the empty server snapshot. */
export function bootSaves() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  const stored = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
  snapshot = documentHasAuthCookie() ? parse(stored) : clone(EMPTY_SAVES);
  if (!documentHasAuthCookie()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(EMPTY_SAVES));
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* private mode / quota */
    }
  }
  window.addEventListener("storage", onStorage);
  listeners.forEach((fn) => fn());
}

export function getSaves() {
  return snapshot;
}

export function subscribeSaves(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSaved(kind: SaveKind, slug: string, saves: Saves = snapshot) {
  return saves[kind === "market" ? "markets" : "vendors"].includes(slug);
}

export function toggleSave(kind: SaveKind, slug: string) {
  const key = kind === "market" ? "markets" : "vendors";
  const current = snapshot[key];
  const nextList = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  emit({ ...snapshot, [key]: nextList });
}

export function replaceSaves(next: Saves) {
  emit({
    markets: [...new Set(next.markets.filter((item) => typeof item === "string" && item))],
    vendors: [...new Set(next.vendors.filter((item) => typeof item === "string" && item))],
  });
}

export function sameSaves(left: Saves, right: Saves) {
  return (
    left.markets.join("\0") === right.markets.join("\0") &&
    left.vendors.join("\0") === right.vendors.join("\0")
  );
}

export function unionSaves(left: Saves, right: Saves): Saves {
  return {
    markets: [...new Set([...left.markets, ...right.markets])],
    vendors: [...new Set([...left.vendors, ...right.vendors])],
  };
}
