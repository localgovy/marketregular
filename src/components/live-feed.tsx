"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [extra, setExtra] = useState<FloorItem[]>([]);

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
          setExtra((current) => {
            if (current.some((post) => post.id === item.id)) return current;
            return [item, ...current].slice(0, 40);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [marketId]);

  const items = useMemo(() => {
    const seen = new Set(initialItems.map((item) => item.id));
    const prepend = extra.filter((item) => !seen.has(item.id));
    return [...prepend, ...initialItems].slice(0, 40);
  }, [extra, initialItems]);

  if (!items.length) {
    return <p className="text-base text-muted-foreground">No reviews yet.</p>;
  }

  return (
    <ol>
      {items.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </ol>
  );
}
