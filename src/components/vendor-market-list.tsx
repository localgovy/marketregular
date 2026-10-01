"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { AddressLink } from "@/components/address-link";
import { Hours } from "@/components/hours";
import { SaveButton } from "@/components/save-button";

export const VENDOR_MARKET_PAGE = 3;

export type VendorMarketRow = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  province: string;
  lat: number | null;
  lng: number | null;
  stall: string | null;
  hours: { day: string; hours: string }[];
};

export function VendorMarketList({ markets }: { markets: VendorMarketRow[] }) {
  const [pages, setPages] = useState(1);
  const focusIndex = useRef<number | null>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const shown = markets.slice(0, pages * VENDOR_MARKET_PAGE);
  const hidden = markets.length - shown.length;

  useLayoutEffect(() => {
    const index = focusIndex.current;
    if (index == null) return;
    focusIndex.current = null;
    links.current[index]?.focus();
  }, [pages]);

  function more() {
    const nextCount = Math.min(markets.length, (pages + 1) * VENDOR_MARKET_PAGE);
    if (nextCount >= markets.length) focusIndex.current = shown.length;
    setPages((count) => count + 1);
  }

  return (
    <>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {shown.map((market, index) => (
          <li key={market.id} className="flex items-start justify-between gap-2 py-2">
            <div className="min-w-0">
              <Link
                ref={(node) => {
                  links.current[index] = node;
                }}
                href={`/markets/${market.slug}`}
                className="font-medium hover:underline"
              >
                {market.name}
              </Link>
              <p className="text-sm text-muted-foreground">
                <AddressLink
                  address={market.address}
                  city={market.city}
                  province={market.province}
                  name={market.name}
                  lat={market.lat}
                  lng={market.lng}
                />
                {market.stall ? ` · ${market.stall}` : ""}
              </p>
              {market.hours.length ? (
                <p className="mt-0.5 grid grid-cols-[auto_auto] justify-start gap-x-2 gap-y-0.5">
                  {market.hours.map((row) => (
                    <span key={`${row.day}-${row.hours}`} className="contents">
                      <span className="text-sm text-muted-foreground">{row.day}</span>
                      <Hours value={row.hours} className="text-muted-foreground" />
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
            <span className="flex shrink-0 items-center">
              <SaveButton kind="market" slug={market.slug} name={market.name} />
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={more}
            className="stall-chip inline-flex h-11 w-full cursor-pointer items-center justify-center bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
          >
            Show more ({hidden})
          </button>
        </div>
      ) : null}
    </>
  );
}
