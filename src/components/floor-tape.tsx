"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloorComposer } from "@/components/floor-composer";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { decodeFloorBody, floorKicker, scrapStyle } from "@/lib/floor-note";
import { timeAgo } from "@/lib/format";
import type { FloorItem, StallRef } from "@/types/database";

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
    <li className={`mx-2 my-2 rounded-sm px-3 py-3 shadow-[1px_2px_0_rgba(23,22,20,0.06)] ${scrapStyle(item.id)}`}>
      <p className="font-heading text-[13px] text-ticket italic">{floorKicker(item)}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{item.author_name ?? "A regular"}</span>
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
        <time className="shrink-0 text-[10px] text-muted-foreground" dateTime={item.created_at}>
          {timeAgo(item.created_at)}
        </time>
      </div>
      {item.kind === "review" && item.rating != null ? (
        <p className="mt-1 text-[10px] font-medium tracking-wide text-ticket">
          {item.rating}/5 · not a shrug
        </p>
      ) : null}
      <p className="mt-1.5 font-heading text-[15px] leading-snug">{item.body}</p>
      {item.tags.length ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-[2px] bg-foreground/90 px-1.5 py-px text-[9px] tracking-[0.12em] text-[#f4f1ea] uppercase"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {item.verified_on_site ? (
        <p className="mt-2 inline-block -rotate-[2deg] border border-stamp px-1.5 py-px text-[9px] font-medium tracking-[0.16em] text-stamp uppercase">
          On site
        </p>
      ) : null}
    </li>
  );
}

export function FloorTape({
  initialItems,
  signedIn,
  stalls,
}: {
  initialItems: FloorItem[];
  signedIn: boolean;
  stalls: StallRef[];
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
    <div className="flex h-full min-h-0 flex-col bg-[#ece7db]">
      <div className="border-b border-border bg-background px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Live floor
        </p>
        <p className="font-heading text-base leading-tight">The tape</p>
        <p className="text-[12px] text-muted-foreground">
          Notes from people on site. Leave one if you’re there.
        </p>
      </div>
      <FloorComposer
        signedIn={signedIn}
        stalls={stalls}
        onPosted={(item) => setItems((current) => [item, ...current].slice(0, 30))}
      />
      {items.length ? (
        <ol className="min-h-0 flex-1 overflow-y-auto pb-3">
          {items.map((item) => (
            <TapeCard key={`${item.kind}-${item.id}`} item={item} stalls={stalls} />
          ))}
        </ol>
      ) : (
        <p className="px-3 py-4 font-heading text-sm text-muted-foreground">
          Blank tape. First peach of the day gets the top slot.
        </p>
      )}
    </div>
  );
}
