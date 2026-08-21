"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloorComposer } from "@/components/floor-composer";
import { ReviewCard } from "@/components/review-card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { reviewFromPost } from "@/lib/floor-note";
import type { FloorItem, Market, Post, StallRef } from "@/types/database";

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
          const row = payload.new as Post;
          if (row.flagged) return;
          const item = reviewFromPost(
            {
              ...row,
              author_name: "Someone on the floor",
              photos: row.photos ?? [],
            },
            stalls,
          );
          setItems((current) => {
            if (current.some((p) => p.id === item.id)) return current;
            return [item, ...current].slice(0, 30);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [stalls]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="tape-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background">
          <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-3">
            <div className="min-w-0">
              <h2 className="type-column">Reviews</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Short notes from Toronto markets. You do not have to share your location.
              </p>
            </div>
            <Link
              href="/feed"
              className="shrink-0 pt-0.5 text-sm font-medium text-primary hover:underline"
            >
              All notes
            </Link>
          </header>
          <FloorComposer
            signedIn={signedIn}
            stalls={stalls}
            markets={markets}
            onPosted={(item) => setItems((current) => [item, ...current].slice(0, 30))}
          />
        </div>
        {items.length ? (
          <ol>
            {items.map((item) => (
              <ReviewCard key={item.id} item={item} stalls={stalls} />
            ))}
          </ol>
        ) : (
          <p className="px-3 py-4 text-base text-muted-foreground">
            No reviews yet. Write the first one in the box above.
          </p>
        )}
      </div>
    </div>
  );
}
