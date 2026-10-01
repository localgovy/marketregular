"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suggestListings } from "@/app/actions/directory";
import { SearchField } from "@/components/search-field";
import { SEARCH_LABEL, SEARCH_PLACEHOLDER } from "@/lib/constants";

type Hit = { href: string; name: string };

export function NotFoundSearch() {
  const [q, setQ] = useState("");
  const [settled, setSettled] = useState("");
  const [markets, setMarkets] = useState<Hit[]>([]);
  const [vendors, setVendors] = useState<Hit[]>([]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void suggestListings(query)
        .then((next) => {
          if (cancelled) return;
          setMarkets(next.markets);
          setVendors(next.vendors);
          setSettled(query);
        })
        .catch(() => {
          if (cancelled) return;
          setMarkets([]);
          setVendors([]);
          setSettled(query);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q]);

  const query = q.trim();
  const searching = query.length >= 2;
  const pending = searching && settled !== query;
  const shownMarkets = searching && !pending ? markets : [];
  const shownVendors = searching && !pending ? vendors : [];

  return (
    <div className="mt-8">
      <form action="/markets">
        <label className="sr-only" htmlFor="not-found-search">
          {SEARCH_LABEL}
        </label>
        <SearchField
          id="not-found-search"
          name="q"
          value={q}
          onChange={setQ}
          placeholder={SEARCH_PLACEHOLDER}
          aria-label={SEARCH_LABEL}
        />
      </form>
      {shownMarkets.length || shownVendors.length ? (
        <div className="mt-4 grid gap-4">
          {shownMarkets.length ? (
            <section>
              <h2 className="type-column">Markets</h2>
              <ul className="mt-2 divide-y divide-border border-t border-border">
                {shownMarkets.map((hit) => (
                  <li key={hit.href}>
                    <Link href={hit.href} className="block py-2 font-medium hover:underline">
                      {hit.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {shownVendors.length ? (
            <section>
              <h2 className="type-column">Vendors</h2>
              <ul className="mt-2 divide-y divide-border border-t border-border">
                {shownVendors.map((hit) => (
                  <li key={hit.href}>
                    <Link href={hit.href} className="block py-2 font-medium hover:underline">
                      {hit.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : pending ? (
        <p className="mt-3 text-sm text-muted-foreground">Searching.</p>
      ) : searching ? (
        <p className="mt-3 text-sm text-muted-foreground">No matches.</p>
      ) : null}
    </div>
  );
}
