"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { emailDaySlip, listDayPlanStalls, type DayPlanStall } from "@/app/actions/day-plan";
import { useDayPlan } from "@/components/day-plan-provider";
import { useGeo } from "@/components/geo-provider";
import { CheckMark, CloseMark } from "@/components/marks";
import { SearchField } from "@/components/search-field";
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
import { openDayPlanHint } from "@/lib/day-plan-hint";
import { openSignInSlip } from "@/lib/signin-slip";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { visitPlanWaitCopy, visitPlanWaitMs } from "@/lib/visit-plan-limit";
import { cn } from "@/lib/utils";

function StallRow({
  name,
  on,
  onToggle,
}: {
  name: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-1 py-1.5 text-left text-sm font-medium",
        on ? "text-foreground" : "text-foreground hover:bg-foreground/[0.06]",
      )}
    >
      <span>{name}</span>
      {on ? <CheckMark className="size-3.5 shrink-0 text-ticket-ink" /> : null}
    </button>
  );
}

export function DayPlanSlip() {
  const titleId = useId();
  const searchId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const asked = useRef(false);
  const busy = useRef(false);
  const { plan, open, tuck, toggleVendor, setMode, patchHours } = useDayPlan();
  const { coords, request } = useGeo();
  const [stalls, setStalls] = useState<DayPlanStall[]>([]);
  const [query, setQuery] = useState("");
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

  useEffect(() => {
    setQuery("");
  }, [slug, date, open]);

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

  const punched = useMemo(() => new Set(plan?.vendorSlugs ?? []), [plan?.vendorSlugs]);
  const needle = query.trim().toLowerCase();
  const punchedStalls = useMemo(
    () => stalls.filter((stall) => punched.has(stall.slug)),
    [stalls, punched],
  );
  const foundStalls = useMemo(() => {
    if (!needle) return [];
    return stalls.filter((stall) => stall.name.toLowerCase().includes(needle));
  }, [stalls, needle]);
  const listed = needle ? foundStalls : punchedStalls;

  if (!open || !plan) return null;

  const slip = plan;
  const meters = coords
    ? distanceMeters(coords, { lat: slip.hall.lat, lng: slip.hall.lng })
    : null;
  const about = meters != null ? formatAboutTime(meters, slip.mode) : null;
  const goHref = mapsUrl(slip.hall.lat, slip.hall.lng, slip.mode, isAppleMapsDevice());
  const note = error ? null : message ?? (now != null && cooling ? visitPlanWaitCopy(waitMs) : null);
  const punchedCount = punchedStalls.length;

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
      className="fixed right-4 bottom-4 left-4 z-50 flex max-h-[min(22rem,calc(100dvh-5.5rem))] max-w-none flex-col rounded-xl bg-card p-3 shadow-md ring-1 ring-foreground/10 outline-none animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none sm:left-auto sm:w-[20.5rem]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={tuck}
        className="absolute top-1 right-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <CloseMark className="size-4" />
      </button>

      <div className="shrink-0 pr-8">
        <p className="text-sm text-muted-foreground">Today’s slip</p>
        <h2 id={titleId} className="type-column mt-0.5">
          {slip.hall.name}
        </h2>
        <p className="mt-0.5 text-sm">
          <span>{formatSlipDate(slip.hall.date)}</span>
          {slip.hall.hours ? (
            <>
              {" · "}
              <Hours value={slip.hall.hours} className="text-foreground" />
            </>
          ) : null}
        </p>
      </div>

      <p className="mt-3 shrink-0 text-sm font-medium">How you go</p>
      <div className="mt-1.5 flex shrink-0 flex-wrap gap-1.5">
        {TRAVEL_MODES.map((item) => {
          const on = slip.mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setMode(item.id)}
              className={cn(
                "stall-chip-sm inline-flex h-8 items-center px-2.5 text-sm font-medium",
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
      <p className="mt-1.5 shrink-0 text-sm text-muted-foreground">
        {meters != null ? (
          <>
            <span className="type-nums text-foreground">{formatDistance(meters)}</span>
            {about ? (
              <>
                {" · "}
                <span className="type-nums text-foreground">{about}</span>
              </>
            ) : null}
          </>
        ) : (
          "Open Maps for the time from where you are."
        )}
      </p>

      <div className="mt-3 shrink-0">
        <div className="flex shrink-0 items-baseline justify-between gap-2">
          <label htmlFor={searchId} className="text-sm font-medium">
            Who to see
          </label>
          {punchedCount ? (
            <p className="text-sm text-muted-foreground">
              <span className="type-nums text-foreground">{punchedCount}</span> punched
            </p>
          ) : null}
        </div>
        <SearchField
          id={searchId}
          value={query}
          onChange={setQuery}
          placeholder="Find a stall"
          className="mt-1.5 h-8"
        />
        <div className="mt-1 max-h-32 overflow-y-auto">
          {pendingStalls && !stalls.length ? (
            <p className="px-1 py-1.5 text-sm text-muted-foreground">Loading stalls…</p>
          ) : listed.length ? (
            <ul>
              {listed.map((stall) => (
                <li key={stall.slug}>
                  <StallRow
                    name={stall.name}
                    on={punched.has(stall.slug)}
                    onToggle={() => toggleVendor(stall.slug)}
                  />
                </li>
              ))}
            </ul>
          ) : needle ? (
            <p className="px-1 py-1.5 text-sm text-muted-foreground">No stall matches.</p>
          ) : stalls.length ? (
            <p className="px-1 py-1.5 text-sm text-muted-foreground">Search to punch a stall.</p>
          ) : (
            <p className="px-1 py-1.5 text-sm text-muted-foreground">
              No stalls listed for that day yet.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        <a
          href={goHref}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-full px-4")}
        >
          Get going
        </a>
        <button
          type="button"
          onClick={() => {
            tuck();
            openDayPlanHint();
          }}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8 rounded-full px-4")}
        >
          Done
        </button>
      </div>
      <button
        type="button"
        disabled={sending || cooling}
        onClick={send}
        className="mt-2 shrink-0 text-sm font-medium text-foreground hover:underline disabled:no-underline disabled:opacity-50"
      >
        {sending ? "Sending…" : "Email this slip"}
      </button>
      {error ? <p className="mt-1 shrink-0 text-sm text-destructive">{error}</p> : null}
      {note ? <p className="mt-1 shrink-0 text-sm text-muted-foreground">{note}</p> : null}
    </aside>
  );
}
