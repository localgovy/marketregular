import { persistListingSave, persistSave } from "@/app/actions/saves";
import { listingFromInput, type SavedListing } from "@/lib/listing-saves";
import { replaceSaves, type SaveKind } from "@/lib/saves";

const KEY = "mr-pending-save";

export type PendingSave =
  | { kind: Exclude<SaveKind, "listing">; slug: string }
  | { kind: "listing"; listing: SavedListing; listings?: SavedListing[] };

export function stashPendingSave(save: PendingSave) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode / quota */
  }
}

function parsePending(raw: string): PendingSave | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PendingSave>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.kind === "listing") {
      const row = (parsed as { listing?: unknown }).listing;
      if (!row || typeof row !== "object") return null;
      const listing = listingFromInput(row as SavedListing);
      if (!listing) return null;
      const extra = (parsed as { listings?: unknown }).listings;
      const listings = Array.isArray(extra)
        ? extra.flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const next = listingFromInput(item as SavedListing);
            return next ? [next] : [];
          })
        : undefined;
      return listings?.length ? { kind: "listing", listing, listings } : { kind: "listing", listing };
    }
    if (parsed.kind === "market" || parsed.kind === "vendor" || parsed.kind === "blog") {
      const slug = (parsed as { slug?: unknown }).slug;
      if (typeof slug !== "string" || !slug) return null;
      return { kind: parsed.kind, slug };
    }
  } catch {
    return null;
  }
  return null;
}

export function takePendingSave(): PendingSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    return parsePending(raw);
  } catch {
    return null;
  }
}

/** Persist a Save the guest started before sign-in. One clip, same chip. */
export async function flushPendingSave() {
  const pending = takePendingSave();
  if (!pending) return;
  if (pending.kind === "listing") {
    const rows = pending.listings?.length ? pending.listings : [pending.listing];
    let canonical = null;
    for (const row of rows) {
      canonical = await persistListingSave(row, true);
      if (!canonical) return;
    }
    replaceSaves(canonical);
    return;
  }
  const canonical = await persistSave(pending.kind, pending.slug, true);
  if (canonical) replaceSaves(canonical);
}
