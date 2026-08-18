"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import type { FloorItem } from "@/types/database";

export function FloorTape({ initialItems }: { initialItems: FloorItem[] }) {
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
          setItems((current) => {
            if (current.some((p) => p.id === row.id)) return current;
            return [
              {
                id: row.id,
                kind: "post" as const,
                body: row.body,
                created_at: row.created_at,
                author_name: "Someone on the floor",
                market_name: null,
                market_slug: null,
                vendor_name: null,
                vendor_slug: null,
                rating: null,
                verified_on_site: row.verified_on_site,
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
          setItems((current) => {
            if (current.some((p) => p.id === row.id)) return current;
            return [
              {
                id: row.id,
                kind: "review" as const,
                body: row.body,
                created_at: row.created_at,
                author_name: "Regular",
                market_name: null,
                market_slug: null,
                vendor_name: null,
                vendor_slug: null,
                rating: row.rating,
                verified_on_site: row.verified_on_site,
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-3 py-3">
        <p className="text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
          Live floor
        </p>
        <p className="text-sm text-muted-foreground">Posts and reviews from people on site</p>
      </div>
      {items.length ? (
        <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
          {items.map((item) => {
            const href = item.market_slug
              ? `/markets/${item.market_slug}`
              : item.vendor_slug
                ? `/vendors/${item.vendor_slug}`
                : null;
            const place = item.market_name ?? item.vendor_name;
            return (
              <li key={`${item.kind}-${item.id}`} className="px-3 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {item.author_name ?? "Regular"}
                    </span>
                    {place ? (
                      <>
                        {" "}
                        {item.kind === "review" ? "on" : "at"}{" "}
                        {href ? (
                          <Link href={href} className="text-primary hover:underline">
                            {place}
                          </Link>
                        ) : (
                          place
                        )}
                      </>
                    ) : null}
                  </p>
                  <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={item.created_at}>
                    {timeAgo(item.created_at)}
                  </time>
                </div>
                {item.kind === "review" && item.rating != null ? (
                  <p className="mt-1 text-[11px] font-medium tracking-wide text-primary">
                    {item.rating}/5 review
                  </p>
                ) : null}
                <p className="mt-1 text-[13px] leading-snug">{item.body}</p>
                {item.verified_on_site ? (
                  <p className="mt-1.5 text-[10px] font-medium tracking-wide text-stamp uppercase">
                    On site
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          No floor notes yet. Stamp in at a market to start the tape.
        </p>
      )}
    </div>
  );
}
