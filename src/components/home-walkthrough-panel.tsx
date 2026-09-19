"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseMark } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";
import {
  rememberHomeWalkthrough,
  homeWalkthroughSeen,
  subscribeHomeWalkthrough,
} from "@/lib/home-walkthrough";
import { cn } from "@/lib/utils";

const DELAY_MS = 700;

export function HomeWalkthroughPanel() {
  const titleId = useId();
  const copyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (homeWalkthroughSeen()) return;
    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => subscribeHomeWalkthrough(() => setOpen(false)), []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    setOpen(false);
    rememberHomeWalkthrough();
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={copyId}
      className="fixed right-4 bottom-4 left-4 z-50 max-w-none rounded-xl bg-card p-4 shadow-md ring-1 ring-foreground/10 outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none sm:left-auto sm:w-[20.5rem]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <CloseMark className="size-4" />
      </button>
      <h2 id={titleId} className="type-column pr-8">
        Welcome to {SITE_NAME}
      </h2>
      <p id={copyId} className="mt-2 text-sm leading-snug text-muted-foreground">
        Find Toronto markets and vendors, then save the ones you go to.
      </p>
      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={dismiss}
          className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-full px-4")}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
