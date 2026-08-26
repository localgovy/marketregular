"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloseMark } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";
import { rememberHomeWalkthrough, homeWalkthroughSeen } from "@/lib/home-walkthrough";
import { cn } from "@/lib/utils";

const DELAY_MS = 700;

const STEPS = [
  {
    title: `Welcome to ${SITE_NAME}`,
    body: "Toronto farmers' markets this week — who's open, the hours, and who's on the floor.",
  },
  {
    title: "Find a market",
    body: "Pick a day, a neighbourhood, what they sell, or a cuisine. Then search.",
  },
  {
    title: "Save the ones you go to",
    body: "Sign in to keep halls and stalls on a list that follows you.",
  },
] as const;

export function HomeWalkthrough() {
  const titleId = useId();
  const copyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (homeWalkthroughSeen()) return;
    const id = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

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

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

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
      <p className="text-sm text-muted-foreground">
        {step + 1} of {STEPS.length}
      </p>
      <h2 id={titleId} className="type-column mt-1 pr-8">
        {current.title}
      </h2>
      <p id={copyId} className="mt-2 text-sm leading-snug text-muted-foreground">
        {current.body}
      </p>
      <div className="mt-4 flex items-center justify-end gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((n) => n - 1)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Back
          </button>
        ) : (
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (last) dismiss();
            else setStep((n) => n + 1);
          }}
          className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-full px-4")}
        >
          {last ? "Got it" : "Next"}
        </button>
      </div>
    </div>
  );
}
