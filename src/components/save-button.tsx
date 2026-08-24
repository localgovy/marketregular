"use client";

import { useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { persistSave } from "@/app/actions/saves";
import {
  EMPTY_SAVES,
  getSaves,
  isSaved,
  subscribeSaves,
  toggleSave,
  replaceSaves,
  type SaveKind,
} from "@/lib/saves";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { cn } from "@/lib/utils";

export function useSaves() {
  return useSyncExternalStore(subscribeSaves, getSaves, () => EMPTY_SAVES);
}

export function SaveButton({
  kind,
  slug,
  name,
  size = "sm",
}: {
  kind: SaveKind;
  slug: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const saves = useSaves();
  const saved = isSaved(kind, slug, saves);
  const label = name ?? (kind === "market" ? "this market" : "this stall");

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={
        saved ? `Remove ${label} from saved` : `Save ${label}`
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = `${window.location.pathname}${window.location.search}`;
        const loginHref = `/login?next=${encodeURIComponent(next || "/account")}`;
        if (!documentHasAuthCookie()) {
          router.push(loginHref);
          return;
        }
        const nextSaved = !saved;
        toggleSave(kind, slug);
        void persistSave(kind, slug, nextSaved)
          .then((canonical) => {
            if (canonical) {
              replaceSaves(canonical);
              if (pathname === "/account" || pathname.startsWith("/account/")) {
                router.refresh();
              }
              return;
            }
            toggleSave(kind, slug);
            router.push(loginHref);
          })
          .catch(() => {
            toggleSave(kind, slug);
          });
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        size === "lg"
          ? "stall-chip h-14 min-w-[6.5rem] px-6 text-lg"
          : size === "md"
            ? "stall-chip-sm h-10 px-3 text-base"
            : "stall-chip-sm h-8 px-2.5 text-sm",
        saved
          ? "bg-foreground text-receipt"
          : "bg-foreground/45 text-muted-foreground hover:bg-foreground hover:text-foreground",
      )}
    >
      {saved ? null : <span aria-hidden className="stall-chip-fill" />}
      <span className="relative">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
