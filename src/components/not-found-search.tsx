"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { suggestListings } from "@/app/actions/directory";
import { SearchField } from "@/components/search-field";
import { SEARCH_LABEL, SEARCH_PLACEHOLDER } from "@/lib/constants";

type Hit = { href: string; name: string };

export function NotFoundSearch() {
  const [q, setQ] = useState("");
  const [markets, setMarkets] = useState<Hit[]>([]);
  const [vendors, setVendors] = useState<Hit[]>([]);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const id = window.setTimeout(() => {
      void suggestListings(query).then((next) => {
        setMarkets(next.markets);
        setVendors(next.vendors);
      });
    }, 180);
    return () => window.clearTimeout(id);
  }, [q]);

  const searching = q.trim().length >= 2;
  const shownMarkets = searching ? markets : [];
  const shownVendors = searching ? vendors : [];

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
          className="bg-card"
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
      ) : searching ? (
        <p className="mt-3 text-sm text-muted-foreground">No matches yet. Keep typing.</p>
      ) : null}
    </div>
  );
}
