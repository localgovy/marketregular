"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloorComposer } from "@/components/floor-composer";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { decodeFloorBody, floorKicker, scrapStyle } from "@/lib/floor-note";
import { timeAgo } from "@/lib/format";
import type { FloorItem, Market, StallRef } from "@/types/database";

function TapeCard({ item, stalls }: { item: FloorItem; stalls: StallRef[] }) {
  const vendor =
    item.vendor_name ??
    stalls.find((s) => s.slug === item.vendor_slug)?.name ??
    null;
  const vendorSlug = item.vendor_slug;
  const vendorHref = vendorSlug ? `/vendors/${vendorSlug}` : null;
  const marketHref = item.market_slug ? `/markets/${item.market_slug}` : null;
  const placeHref = vendorHref ?? marketHref;
  const place = vendor ?? item.market_name;

  return (
    <li
      className={`mx-2 my-2 rounded-sm px-3 py-3 shadow-[1px_2px_0_rgba(23,22,20,0.08)] ${scrapStyle(item.id)} ${
        item.kind === "review"
          ? "shadow-[inset_3px_0_0_var(--ticket),1px_2px_0_rgba(23,22,20,0.08)]"
          : "shadow-[inset_3px_0_0_var(--stamp),1px_2px_0_rgba(23,22,20,0.08)]"
      }`}
    >
      <p className="text-sm font-medium text-ticket">{floorKicker(item)}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{item.author_name ?? "A shopper"}</span>
          {place ? (
            <>
              {" "}
              {item.kind === "review" ? "on" : "at"}{" "}
              {placeHref ? (
                <Link href={placeHref} className="text-primary hover:underline">
                  {place}
                </Link>
              ) : (
                place
              )}
            </>
          ) : null}
        </p>
        <time className="shrink-0 text-sm text-muted-foreground" dateTime={item.created_at}>
          {timeAgo(item.created_at)}
        </time>
      </div>
      <p className="mt-1.5 text-base leading-snug">{item.body}</p>
      {item.tags.length ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-none bg-foreground/90 px-2 py-0.5 text-sm text-receipt stall-chip-sm"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {item.verified_on_site ? (
        <p className="mt-2 inline-block border border-stamp px-1.5 py-0.5 text-sm text-stamp">
          Posted at the market
        </p>
      ) : null}
    </li>
  );
}

export function FloorTape({
  initialItems,
  signedIn,
  stalls,
  markets,
}: {
  initialItems: FloorItem[];
  signedIn: boolean;
  stalls: StallRef[];
  markets: Market[];
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("floor-tape")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            verified_on_site: boolean;
            flagged?: boolean;
          };
          if (row.flagged) return;
          const decoded = decodeFloorBody(row.body);
          setItems((current) => {
            if (current.some((p) => p.id === row.id)) return current;
            return [
              {
                id: row.id,
                kind: "post" as const,
                body: decoded.body,
                created_at: row.created_at,
                author_name: "Someone on the floor",
                market_name: null,
                market_slug: null,
                vendor_name: null,
                vendor_slug: decoded.vendorSlug,
                rating: null,
                verified_on_site: row.verified_on_site,
                tags: decoded.tags,
              },
              ...current,
            ].slice(0, 30);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            rating: number;
            verified_on_site: boolean;
            flagged?: boolean;
          };
          if (row.flagged) return;
          const decoded = decodeFloorBody(row.body);
          setItems((current) => {
            if (current.some((p) => p.id === row.id)) return current;
            return [
              {
                id: row.id,
                kind: "review" as const,
                body: decoded.body,
                created_at: row.created_at,
                author_name: "Regular",
                market_name: null,
                market_slug: null,
                vendor_name: null,
                vendor_slug: decoded.vendorSlug,
                rating: row.rating,
                verified_on_site: row.verified_on_site,
                tags: decoded.tags,
              },
              ...current,
            ].slice(0, 30);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="tape-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="awning-board px-3 pt-4 pb-3 text-chalk">
          <p className="type-kicker flex items-center gap-2 text-chalk/80">
            <span className="live-dot size-2 rounded-full bg-chalk" />
            Live notes
          </p>
          <h2 className="type-column">The group chat from the stalls</h2>
          <p className="mt-1 text-base leading-snug text-chalk/80">
            The peaches, the line, the loaf that already sold out. Read it here, and add yours
            if you want. Location is optional.
          </p>
        </div>
        <div className="sticky top-0 z-10">
          <FloorComposer
            signedIn={signedIn}
            stalls={stalls}
            markets={markets}
            onPosted={(item) => setItems((current) => [item, ...current].slice(0, 30))}
          />
        </div>
        {items.length ? (
          <ol className="pb-4">
            {items.map((item) => (
              <TapeCard key={`${item.kind}-${item.id}`} item={item} stalls={stalls} />
            ))}
          </ol>
        ) : (
          <p className="px-3 py-4 text-base text-muted-foreground">
            No notes yet. Write the first one in the box above.
          </p>
        )}
      </div>
    </div>
  );
}
