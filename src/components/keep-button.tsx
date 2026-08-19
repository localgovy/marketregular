"use client";

import { useSyncExternalStore } from "react";
import {
  EMPTY_KEEPS,
  getKeeps,
  isKept,
  subscribeKeeps,
  toggleKeep,
  type KeepKind,
} from "@/lib/keeps";
import { cn } from "@/lib/utils";

export function useKeeps() {
  return useSyncExternalStore(subscribeKeeps, getKeeps, () => EMPTY_KEEPS);
}

export function KeepButton({
  kind,
  slug,
  name,
  size = "sm",
}: {
  kind: KeepKind;
  slug: string;
  name?: string;
  size?: "sm" | "md";
}) {
  const keeps = useKeeps();
  const kept = isKept(kind, slug, keeps);
  const label = name ?? (kind === "market" ? "this market" : "this stall");

  return (
    <button
      type="button"
      aria-pressed={kept}
      aria-label={kept ? `Remove ${label} from your list` : `Keep ${label} on your list`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleKeep(kind, slug);
      }}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm font-mono font-semibold tracking-[0.14em] uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        size === "md" ? "h-10 px-3 text-[11px]" : "h-8 px-2.5 text-[10px]",
        kept
          ? "bg-foreground text-receipt"
          : "border border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {kept ? "Kept" : "Keep"}
    </button>
  );
}
