"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { emailDaySlip, listDayPlanStalls, type DayPlanStall } from "@/app/actions/day-plan";
import { useDayPlan } from "@/components/day-plan-provider";
import { useGeo } from "@/components/geo-provider";
import { CheckMark, CloseMark } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import { Hours } from "@/components/hours";
import {
  TRAVEL_MODES,
  formatAboutTime,
  formatSlipDate,
  isAppleMapsDevice,
  mapsUrl,
} from "@/lib/day-plan";
import { formatDistance, distanceMeters } from "@/lib/geo";
import { openSignInSlip } from "@/lib/signin-slip";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { visitPlanWaitCopy, visitPlanWaitMs } from "@/lib/visit-plan-limit";
import { cn } from "@/lib/utils";

const STALL_CAP = 12;

export function DayPlanSlip() {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const asked = useRef(false);
  const busy = useRef(false);
  const { plan, open, tuck, toggleVendor, setMode, patchHours } = useDayPlan();
  const { coords, request } = useGeo();
  const [stalls, setStalls] = useState<DayPlanStall[]>([]);
  const [expandedKey, setExpandedKey] = useState("");
  const [pendingStalls, startStalls] = useTransition();
  const [sending, startSend] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const waitMs = visitPlanWaitMs(sentAt, now ?? 0);
  const cooling = waitMs > 0;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") tuck();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, tuck]);

  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    if (!coords) request();
  }, [open, coords, request]);

  useEffect(() => {
    const tick = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.clearTimeout(tick);
      window.clearInterval(id);
    };
  }, []);

  const slug = plan?.hall.slug;
  const date = plan?.hall.date;
  const stallKey = slug && date ? `${slug}:${date}` : "";
  const restOpen = expandedKey === stallKey;

  useEffect(() => {
    if (!open || !slug || !date) return;
    let ignore = false;
    startStalls(async () => {
      const result = await listDayPlanStalls(slug, date);
      if (ignore) return;
      setStalls(result.stalls);
      if (result.hours) patchHours(result.hours);
    });
    return () => {
      ignore = true;
    };
  }, [open, slug, date, patchHours]);

  if (!open || !plan) return null;

  const slip = plan;
  const meters = coords
    ? distanceMeters(coords, { lat: slip.hall.lat, lng: slip.hall.lng })
    : null;
  const about = meters != null ? formatAboutTime(meters, slip.mode) : null;
  const shown = restOpen ? stalls : stalls.slice(0, STALL_CAP);
  const hidden = Math.max(0, stalls.length - STALL_CAP);
  const punched = new Set(slip.vendorSlugs);
  const goHref = mapsUrl(slip.hall.lat, slip.hall.lng, slip.mode, isAppleMapsDevice());
  const note = error ? null : message ?? (now != null && cooling ? visitPlanWaitCopy(waitMs) : null);

  function send() {
    if (busy.current || cooling) return;
    if (!documentHasAuthCookie()) {
      openSignInSlip({
        next: `${window.location.pathname}${window.location.search}`,
        name: slip.hall.name,
        copy: "Sign in to email this slip.",
      });
      return;
    }
    busy.current = true;
    setMessage(null);
    setError(null);
    startSend(async () => {
      try {
        const result = await emailDaySlip({
          marketSlug: slip.hall.slug,
          date: slip.hall.date,
          vendorSlugs: slip.vendorSlugs,
          mode: slip.mode,
        });
        if (result.wait) {
          setSentAt(new Date().toISOString());
          setMessage(result.message ?? visitPlanWaitCopy(visitPlanWaitMs(new Date().toISOString())));
          return;
        }
        if (result.error) {
          setError(result.error);
          return;
        }
        setSentAt(new Date().toISOString());
        setMessage(result.message ?? "Sent.");
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed right-4 bottom-4 left-4 z-50 max-h-[min(36rem,calc(100dvh-5rem))] max-w-none overflow-y-auto rounded-xl bg-card p-4 shadow-md ring-1 ring-foreground/10 outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none sm:left-auto sm:w-[22.5rem]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={tuck}
        className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <CloseMark className="size-4" />
      </button>
      <p className="text-sm text-muted-foreground">Today’s slip</p>
      <h2 id={titleId} className="type-column mt-1 pr-8">
        {slip.hall.name}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{slip.hall.address}</p>
      <p className="mt-1 text-sm">
        <span>{formatSlipDate(slip.hall.date)}</span>
        {slip.hall.hours ? (
          <>
            {" · "}
            <Hours value={slip.hall.hours} className="text-foreground" />
          </>
        ) : null}
      </p>

      <p className="mt-4 text-sm font-medium">How you go</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TRAVEL_MODES.map((item) => {
          const on = slip.mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setMode(item.id)}
              className={cn(
                "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
                on
                  ? "bg-foreground text-receipt"
                  : "bg-secondary text-foreground hover:bg-foreground/10",
              )}
            >
              {on ? null : <span aria-hidden className="stall-chip-fill" />}
              <span className="relative">{item.label}</span>
            </button>
          );
        })}
      </div>
      <a
        href={goHref}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ size: "sm" }), "mt-3 h-8 rounded-full px-4")}
      >
        Get going
      </a>

      <p className="mt-4 text-sm font-medium">How far</p>
      {meters != null ? (
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="type-nums text-foreground">{formatDistance(meters)}</span>
          {about ? (
            <>
              {" · "}
              <span className="type-nums text-foreground">{about}</span>
            </>
          ) : null}
          <span> as the crow flies</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Open Maps for the time from where you are.
        </p>
      )}

      <p className="mt-4 text-sm font-medium">Who to see</p>
      {pendingStalls && !stalls.length ? (
        <p className="mt-1 text-sm text-muted-foreground">Loading stalls…</p>
      ) : stalls.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {shown.map((stall) => {
            const on = punched.has(stall.slug);
            return (
              <li key={stall.slug}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleVendor(stall.slug)}
                  className={cn(
                    "stall-chip-sm relative inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium",
                    on
                      ? "bg-foreground text-receipt"
                      : "bg-secondary text-foreground hover:bg-foreground/10",
                  )}
                >
                  {on ? null : <span aria-hidden className="stall-chip-fill" />}
                  <span className="relative inline-flex items-center gap-1.5">
                    {on ? <CheckMark className="size-3.5" /> : null}
                    {stall.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">No stalls listed for that day yet.</p>
      )}
      {hidden > 0 && !restOpen ? (
        <button
          type="button"
          onClick={() => setExpandedKey(stallKey)}
          className="mt-2 text-sm font-medium text-foreground hover:underline"
        >
          See the rest
        </button>
      ) : null}

      <button
        type="button"
        disabled={sending || cooling}
        onClick={send}
        className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 h-8 rounded-full px-4")}
      >
        {sending ? "Sending…" : "Email this slip"}
      </button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
    </aside>
  );
}
