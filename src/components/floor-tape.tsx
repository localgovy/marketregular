"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FloorComposer } from "@/components/floor-composer";
import { ReviewCard } from "@/components/review-card";
import type { FloorItem, Market, StallRef } from "@/types/database";

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

  return (
    <div className="flex min-h-0 flex-col bg-background lg:h-full">
      <div className="min-h-0 lg:tape-scroll lg:flex-1 lg:overflow-y-auto">
        <div className="bg-background lg:sticky lg:top-0 lg:z-10">
          <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
            <h2 className="type-column">Reviews</h2>
            <Link
              href="/feed"
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              All posts
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
