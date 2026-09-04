"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { persistListingSave, persistSave } from "@/app/actions/saves";
import {
  EMPTY_SAVES,
  getSaves,
  isSaved,
  subscribeSaves,
  toggleSave,
  toggleListing,
  replaceSaves,
  type SaveKind,
  type SavedListing,
} from "@/lib/saves";
import { openSignInSlip } from "@/lib/signin-slip";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { cn } from "@/lib/utils";

export function useSaves() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return useSyncExternalStore(
    subscribeSaves,
    mounted ? getSaves : () => EMPTY_SAVES,
    () => EMPTY_SAVES,
  );
}

function saveChipClass(size: "sm" | "md" | "lg", saved: boolean) {
  return cn(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
    size === "lg"
      ? "stall-chip h-14 min-w-[6.5rem] px-6 text-lg"
      : size === "md"
        ? "stall-chip-sm h-10 px-3 text-base"
        : "stall-chip-sm h-8 px-2.5 text-sm",
    saved
      ? "bg-foreground text-receipt"
      : "bg-foreground/45 text-muted-foreground hover:bg-foreground hover:text-foreground",
  );
}

function refreshIfSavedPage(pathname: string, router: ReturnType<typeof useRouter>) {
  if (pathname === "/account" || pathname.startsWith("/account/") || pathname === "/saved") {
    router.refresh();
  }
}

function copySaves() {
  const current = getSaves();
  return {
    markets: [...current.markets],
    vendors: [...current.vendors],
    blogs: [...current.blogs],
    listings: current.listings.map((row) => ({ ...row, vendors: [...row.vendors] })),
  };
}

export function SaveButton({
  kind,
  slug,
  name,
  size = "sm",
}: {
  kind: Exclude<SaveKind, "listing">;
  slug: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const saves = useSaves();
  const saved = isSaved(kind, slug, saves);
  const label =
    name ??
    (kind === "market" ? "this market" : kind === "vendor" ? "this stall" : "this note");

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = `${window.location.pathname}${window.location.search}`;
        const loginHref = `/login?next=${encodeURIComponent(next || "/account")}`;
        if (!documentHasAuthCookie()) {
          openSignInSlip({ next, name: label });
          return;
        }
        const nextSaved = !saved;
        const before = copySaves();
        toggleSave(kind, slug);
        void persistSave(kind, slug, nextSaved)
          .then((canonical) => {
            if (canonical) {
              replaceSaves(canonical);
              refreshIfSavedPage(pathname, router);
              return;
            }
            replaceSaves(before);
            if (!documentHasAuthCookie()) router.push(loginHref);
          })
          .catch(() => {
            replaceSaves(before);
          });
      }}
      className={saveChipClass(size, saved)}
    >
      {saved ? null : <span aria-hidden className="stall-chip-fill" />}
      <span className="relative">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}

export function ListingSaveButton({
  listing,
  size = "sm",
}: {
  listing: SavedListing;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const saves = useSaves();
  const saved = isSaved("listing", listing.slug, saves);
  const label = listing.marketName;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = `${window.location.pathname}${window.location.search}`;
        const loginHref = `/login?next=${encodeURIComponent(next || "/account")}`;
        if (!documentHasAuthCookie()) {
          openSignInSlip({ next, name: label });
          return;
        }
        const nextSaved = !saved;
        const before = copySaves();
        toggleListing(listing);
        void persistListingSave(listing, nextSaved)
          .then((canonical) => {
            if (canonical) {
              replaceSaves(canonical);
              refreshIfSavedPage(pathname, router);
              return;
            }
            replaceSaves(before);
            if (!documentHasAuthCookie()) router.push(loginHref);
          })
          .catch(() => {
            replaceSaves(before);
          });
      }}
      className={saveChipClass(size, saved)}
    >
      {saved ? null : <span aria-hidden className="stall-chip-fill" />}
      <span className="relative">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
