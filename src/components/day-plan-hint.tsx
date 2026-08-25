"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseMark } from "@/components/marks";
import { subscribeDayPlanHint } from "@/lib/day-plan-hint";

const HIDE_MS = 10_000;

export function DayPlanHint() {
  const pathname = usePathname();
  const copyId = useId();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname === "/saved") setVisible(false);
  }, [pathname]);

  useEffect(() => {
    let hide = 0;
    const stop = subscribeDayPlanHint(() => {
      if (window.location.pathname === "/saved") return;
      setVisible(true);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setVisible(false), HIDE_MS);
    });
    return () => {
      stop();
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <aside
      aria-label="Today’s slip"
      aria-describedby={copyId}
      className="fixed right-4 bottom-4 left-4 z-[55] max-w-none rounded-xl bg-card p-3 shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 duration-150 motion-reduce:animate-none sm:left-auto sm:w-[18rem]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => setVisible(false)}
        className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <CloseMark className="size-4" />
      </button>
      <p id={copyId} className="pr-8 text-sm leading-snug">
        Find today’s slip in{" "}
        <Link
          href="/saved#slip"
          onClick={() => setVisible(false)}
          className="font-medium text-foreground hover:underline"
        >
          Saved
        </Link>.
      </p>
    </aside>
  );
}
