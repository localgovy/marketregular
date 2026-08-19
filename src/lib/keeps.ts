export type KeepKind = "market" | "vendor";

export type Keeps = {
  markets: string[];
  vendors: string[];
};

export const EMPTY_KEEPS: Keeps = { markets: [], vendors: [] };

const KEY = "mr-keeps";
const listeners = new Set<() => void>();
let snapshot: Keeps = EMPTY_KEEPS;

function clone(keeps: Keeps): Keeps {
  return { markets: [...keeps.markets], vendors: [...keeps.vendors] };
}

function parse(raw: string | null): Keeps {
  if (!raw) return clone(EMPTY_KEEPS);
  try {
    const parsed = JSON.parse(raw) as Partial<Keeps>;
    return {
      markets: Array.isArray(parsed.markets)
        ? parsed.markets.filter((item): item is string => typeof item === "string")
        : [],
      vendors: Array.isArray(parsed.vendors)
        ? parsed.vendors.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return clone(EMPTY_KEEPS);
  }
}

function emit(next: Keeps) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  snapshot = parse(window.localStorage.getItem(KEY));
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    snapshot = parse(event.newValue);
    listeners.forEach((fn) => fn());
  });
}

export function getKeeps() {
  return snapshot;
}

export function subscribeKeeps(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isKept(kind: KeepKind, slug: string, keeps: Keeps = snapshot) {
  return keeps[kind === "market" ? "markets" : "vendors"].includes(slug);
}

export function toggleKeep(kind: KeepKind, slug: string) {
  const key = kind === "market" ? "markets" : "vendors";
  const current = snapshot[key];
  const nextList = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  emit({ ...snapshot, [key]: nextList });
}
