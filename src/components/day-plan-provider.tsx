"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import {
  dayPlanServerSnapshot,
  dayPlanSnapshot,
  mergeHall,
  parseDayPlan,
  subscribeDayPlan,
  writeDayPlan,
  type DayPlan,
  type DayPlanHall,
  type TravelMode,
} from "@/lib/day-plan";
import { openSignInSlip } from "@/lib/signin-slip";
import { DAY_PLAN_NAME } from "@/lib/constants";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

type DayPlanState = {
  plan: DayPlan | null;
  open: boolean;
  ready: boolean;
  putHall: (hall: DayPlanHall) => void;
  punchVendor: (slug: string, hall: DayPlanHall) => void;
  toggleVendor: (slug: string) => void;
  setMode: (mode: TravelMode) => void;
  patchHours: (hours: string) => void;
  show: () => void;
  tuck: () => void;
};

const DayPlanContext = createContext<DayPlanState | null>(null);

function storedPlan(raw: string): DayPlan | null {
  if (!raw) return null;
  try {
    return parseDayPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

function requireSignedIn(name: string) {
  if (documentHasAuthCookie()) return true;
  if (typeof window === "undefined") return false;
  openSignInSlip({
    next: `${window.location.pathname}${window.location.search}`,
    name,
    copy: `Sign in to put ${name} on today’s ${DAY_PLAN_NAME}.`,
  });
  return false;
}

export function DayPlanProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const raw = useSyncExternalStore(subscribeDayPlan, dayPlanSnapshot, dayPlanServerSnapshot);
  const [allowed, setAllowed] = useState(false);
  const plan = useMemo(() => {
    if (!allowed) return null;
    return storedPlan(raw);
  }, [allowed, raw]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setAllowed(documentHasAuthCookie());
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      try {
        const next = new URL(href, window.location.href);
        if (next.origin !== window.location.origin) return;
        if (next.pathname === window.location.pathname) return;
        setOpen(false);
      } catch {
        // ignore malformed hrefs
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const putHall = useCallback((hall: DayPlanHall) => {
    if (!requireSignedIn(hall.name)) return;
    setAllowed(true);
    const current = storedPlan(dayPlanSnapshot());
    if (current && current.hall.slug === hall.slug) {
      writeDayPlan({
        ...current,
        hall: mergeHall(current.hall, hall),
      });
    } else {
      writeDayPlan({
        hall,
        vendorSlugs: [],
        mode: current?.mode ?? "walk",
      });
    }
    setOpen(true);
  }, []);

  const punchVendor = useCallback((slug: string, hall: DayPlanHall) => {
    if (!requireSignedIn(hall.name)) return;
    setAllowed(true);
    const current = storedPlan(dayPlanSnapshot());
    if (current && current.hall.slug === hall.slug) {
      const has = current.vendorSlugs.includes(slug);
      writeDayPlan({
        ...current,
        hall: mergeHall(current.hall, hall),
        vendorSlugs: has
          ? current.vendorSlugs.filter((item) => item !== slug)
          : [...current.vendorSlugs, slug],
      });
    } else {
      writeDayPlan({
        hall,
        vendorSlugs: [slug],
        mode: current?.mode ?? "walk",
      });
    }
    setOpen(true);
  }, []);

  const toggleVendor = useCallback((slug: string) => {
    if (!documentHasAuthCookie()) return;
    const current = storedPlan(dayPlanSnapshot());
    if (!current) return;
    const has = current.vendorSlugs.includes(slug);
    writeDayPlan({
      ...current,
      vendorSlugs: has
        ? current.vendorSlugs.filter((item) => item !== slug)
        : [...current.vendorSlugs, slug],
    });
  }, []);

  const setMode = useCallback((mode: TravelMode) => {
    if (!documentHasAuthCookie()) return;
    const current = storedPlan(dayPlanSnapshot());
    if (!current) return;
    writeDayPlan({ ...current, mode });
  }, []);

  const patchHours = useCallback((hours: string) => {
    if (!documentHasAuthCookie()) return;
    const current = storedPlan(dayPlanSnapshot());
    if (!current || current.hall.hours === hours || !hours) return;
    writeDayPlan({ ...current, hall: { ...current.hall, hours } });
  }, []);

  const show = useCallback(() => {
    if (!documentHasAuthCookie()) return;
    setOpen(true);
  }, []);
  const tuck = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      plan,
      open,
      ready: true,
      putHall,
      punchVendor,
      toggleVendor,
      setMode,
      patchHours,
      show,
      tuck,
    }),
    [plan, open, putHall, punchVendor, toggleVendor, setMode, patchHours, show, tuck],
  );

  return <DayPlanContext.Provider value={value}>{children}</DayPlanContext.Provider>;
}

export function useDayPlan() {
  const ctx = useContext(DayPlanContext);
  if (!ctx) {
    return {
      plan: null,
      open: false,
      ready: false,
      putHall: () => undefined,
      punchVendor: () => undefined,
      toggleVendor: () => undefined,
      setMode: () => undefined,
      patchHours: () => undefined,
      show: () => undefined,
      tuck: () => undefined,
    } satisfies DayPlanState;
  }
  return ctx;
}
