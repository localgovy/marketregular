"use client";

import { useEffect, useRef, useState } from "react";
import { DirectoryResults } from "@/components/directory-results";
import { DirectorySort } from "@/components/directory-sort";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { SearchForm } from "@/components/search-form";
import type { DirectoryView } from "@/lib/directory-page";
import { countLabel } from "@/lib/format";
import {
  directoryViewHref,
  marketsCrumbs,
  marketsHref,
  marketsSearchFromSearchParams,
  type MarketsSearch,
  type PlaceAreas,
} from "@/lib/find-paths";
import { LAUNCH_CITY } from "@/lib/launch";
import { pushAppUrl, replaceAppUrl } from "@/lib/native-history";

function hasNear(search: MarketsSearch) {
  if (!search.lat || !search.lng) return false;
  return Number.isFinite(Number(search.lat)) && Number.isFinite(Number(search.lng));
}

function directoryCopy(search: MarketsSearch, marketTotal: number, vendorTotal: number) {
  const crumbs = marketsCrumbs({
    weekdays: search.weekdays,
    setup: search.setup,
    areas: search.areas,
    tags: search.tags,
    openNow: search.openNow,
    near: hasNear(search),
    sort: search.sort,
  });
  const status = [LAUNCH_CITY, ...crumbs, countLabel(marketTotal, "market", "markets")].join(" · ");
  const summary = [
    countLabel(marketTotal, "market", "markets"),
    countLabel(vendorTotal, "vendor", "vendors"),
    crumbs.join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  return { status, summary, queried: Boolean(search.q?.trim()) };
}

function isDirectoryView(value: unknown): value is DirectoryView {
  if (!value || typeof value !== "object") return false;
  const row = value as DirectoryView;
  return (
    typeof row.sortedAt === "string" &&
    Array.isArray(row.markets) &&
    Array.isArray(row.vendors) &&
    row.schedulesByMarket != null &&
    typeof row.schedulesByMarket === "object" &&
    typeof row.marketTotal === "number" &&
    typeof row.vendorTotal === "number" &&
    Array.isArray(row.mapMarkets)
  );
}

export function MarketsBrowser({
  initialSearch,
  initialNow,
  initialView,
  places,
  todayWeekday,
}: {
  initialSearch: MarketsSearch;
  initialNow: string;
  initialView: DirectoryView;
  places: PlaceAreas;
  todayWeekday: number;
}) {
  const views = useRef(new Map<string, DirectoryView>());
  const inflight = useRef(new Map<string, Promise<DirectoryView>>());
  const requestId = useRef(0);
  const [search, setSearch] = useState(initialSearch);
  const [shown, setShown] = useState({
    search: initialSearch,
    view: initialView,
    now: initialNow,
  });

  if (!views.current.has(marketsHref(initialSearch))) {
    views.current.set(marketsHref(initialSearch), initialView);
  }

  async function fetchView(href: string, next: MarketsSearch) {
    const pending = inflight.current.get(href);
    if (pending) return pending;
    const task = (async () => {
      const response = await fetch(directoryViewHref(next));
      if (!response.ok) throw new Error("directory");
      const body: unknown = await response.json();
      if (!isDirectoryView(body)) throw new Error("directory");
      views.current.set(href, body);
      return body;
    })();
    inflight.current.set(href, task);
    try {
      return await task;
    } finally {
      inflight.current.delete(href);
    }
  }

  function applyTagSearch(next: MarketsSearch) {
    const href = marketsHref(next);
    const currentHref = marketsHref(search);
    setSearch(next);
    const cached = views.current.get(href);
    if (cached) {
      setShown({ search: next, view: cached, now: new Date().toISOString() });
      if (href !== currentHref) pushAppUrl(href);
      return;
    }
    const id = ++requestId.current;
    if (href !== currentHref) pushAppUrl(href);
    const previous = shown;
    void fetchView(href, next)
      .then((view) => {
        if (requestId.current !== id) return;
        setShown({ search: next, view, now: new Date().toISOString() });
      })
      .catch(() => {
        if (requestId.current !== id) return;
        setSearch(previous.search);
        replaceAppUrl(marketsHref(previous.search));
      });
  }

  function intendTagSearch(next: MarketsSearch) {
    const href = marketsHref(next);
    if (views.current.has(href) || inflight.current.has(href)) return;
    void fetchView(href, next).catch(() => {
      views.current.delete(href);
    });
  }

  useEffect(() => {
    function onPop(event: PopStateEvent) {
      const url = new URL(window.location.href);
      if (url.pathname !== "/markets") return;
      const nextOwned = !event.state || typeof event.state !== "object" || !("__NA" in event.state);
      if (nextOwned) event.stopImmediatePropagation();
      const next = marketsSearchFromSearchParams(url.searchParams);
      const href = marketsHref(next);
      const id = ++requestId.current;
      setSearch(next);
      const cached = views.current.get(href);
      if (cached) {
        setShown({ search: next, view: cached, now: new Date().toISOString() });
        return;
      }
      void fetchView(href, next)
        .then((view) => {
          if (requestId.current !== id) return;
          setShown({ search: next, view, now: new Date().toISOString() });
        })
        .catch(() => {
          if (requestId.current !== id) return;
        });
    }
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, []);

  const copy = directoryCopy(shown.search, shown.view.marketTotal, shown.view.vendorTotal);
  const href = marketsHref(shown.search);

  return (
    <>
      <p className="type-kicker mt-2 mb-6 text-muted-foreground">{copy.status}</p>
      <SearchForm
        resultCount={shown.view.marketTotal}
        places={places}
        todayWeekday={todayWeekday}
        defaults={search}
        onTagSearch={applyTagSearch}
        onTagIntent={intendTagSearch}
      />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <a
            href="#directory-markets"
            className="text-base font-medium underline decoration-primary decoration-2 underline-offset-8"
          >
            Search Results
          </a>
          <DirectorySort search={search} />
        </div>
        <p className="text-sm text-muted-foreground">{copy.summary}</p>
      </div>
      <div aria-busy={marketsHref(search) !== href}>
        <DirectoryResults
          key={href}
          now={shown.now}
          sortedAt={shown.view.sortedAt}
          search={shown.search}
          markets={shown.view.markets}
          vendors={shown.view.vendors}
          schedulesByMarket={shown.view.schedulesByMarket}
          marketTotal={shown.view.marketTotal}
          vendorTotal={shown.view.vendorTotal}
          weekdays={shown.search.weekdays}
        />
      </div>
      {copy.queried ? null : (
        <div className="mt-8">
          <MarketMapLazy
            markets={shown.view.mapMarkets}
            load="visible"
            className="h-56 w-full overflow-hidden rounded-xl ring-1 ring-foreground/10"
          />
        </div>
      )}
    </>
  );
}
