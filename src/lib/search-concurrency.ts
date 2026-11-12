const DEFAULT_MAX_IN_FLIGHT = 12;

let activeSearches = 0;

export function currentSearchInFlight() {
  return activeSearches;
}

export function resetSearchConcurrency() {
  activeSearches = 0;
}

/**
 * Guard Supabase's connection pool against synchronized multi-IP search
 * stampedes inside one Fluid Compute worker. Normal visitor concurrency is 0–2.
 */
export function tryAcquireSearchSlot(maxInFlight = DEFAULT_MAX_IN_FLIGHT): (() => void) | null {
  if (activeSearches >= maxInFlight) return null;
  activeSearches += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeSearches = Math.max(0, activeSearches - 1);
  };
}
