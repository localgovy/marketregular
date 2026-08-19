"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_SAVES,
  getSaves,
  isSaved,
  subscribeSaves,
  toggleSave,
  type SaveKind,
} from "@/lib/saves";
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
  size?: "sm" | "md";
}) {
  const saves = useSaves();
  const saved = isSaved(kind, slug, saves);
  const label = name ?? (kind === "market" ? "this market" : "this stall");

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSave(kind, slug);
      }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center stall-chip-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        size === "md" ? "h-10 px-3 text-base" : "h-8 px-2.5 text-sm",
        saved
          ? "bg-foreground text-receipt"
          : "border border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
