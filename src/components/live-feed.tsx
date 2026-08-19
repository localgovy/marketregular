"use client";

import { useEffect, useState } from "react";
import { ReviewCard } from "@/components/review-card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { reviewFromPost } from "@/lib/floor-note";
import type { FloorItem, Post } from "@/types/database";

export function LiveFeed({
  initialItems,
  marketId,
}: {
  initialItems: FloorItem[];
  marketId?: string;
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel(marketId ? `live-reviews-${marketId}` : "live-reviews")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as Post;
          if (row.flagged) return;
          if (marketId && row.market_id !== marketId) return;
          const item = reviewFromPost({
            ...row,
            author_name: "Someone on the floor",
            photos: row.photos ?? [],
          });
          setItems((current) => {
            if (current.some((p) => p.id === item.id)) return current;
            return [item, ...current].slice(0, 40);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [marketId]);

  if (!items.length) {
    return (
      <p className="text-base text-muted-foreground">
        No reviews yet. Write the first one from home.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </ol>
  );
}
