"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FloorComposer } from "@/components/floor-composer";
import { ReviewCard } from "@/components/review-card";
import { SearchField } from "@/components/search-field";
import {
  feedIsFiltered,
  feedSearchString,
  filterFeed,
  parseFeedQuery,
  tagsInFeed,
  type FeedQuery,
} from "@/lib/feed-filter";
import { tagLabel } from "@/lib/find-paths";
import { reviewFromPost } from "@/lib/floor-note";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { FloorItem, Market, Post, StallRef } from "@/types/database";

function queryFromParams(params: URLSearchParams): FeedQuery {
  return parseFeedQuery({
    q: params.get("q") ?? undefined,
    market: params.get("market") ?? undefined,
    vendor: params.get("vendor") ?? undefined,
    tag: params.get("tag") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });
}

export function FeedBoard({
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
  const router = useRouter();
  const params = useSearchParams();
  const query = useMemo(() => queryFromParams(params), [params]);
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState(query.q);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setSearch(query.q);
  }, [query.q]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("floor-feed")
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
            return [item, ...current].slice(0, 80);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [stalls]);

  function go(next: FeedQuery) {
    router.replace(feedSearchString(next), { scroll: false });
  }

  const topics = useMemo(() => tagsInFeed(items), [items]);
  const visible = useMemo(() => filterFeed(items, query), [items, query]);
  const filtered = feedIsFiltered(query);
  const marketName = query.market
    ? (markets.find((m) => m.slug === query.market)?.name ?? query.market)
    : "";
  const vendorName = query.vendor
    ? (stalls.find((s) => s.slug === query.vendor)?.name ?? query.vendor)
    : "";

  return (
    <div className="mt-8 min-w-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-3">
        <h2 className="type-column">Reviews</h2>
        <p className="flex flex-wrap items-baseline gap-x-1 text-sm">
          <Link
            href={feedSearchString({ ...query, q: "", market: "", vendor: "", tag: "" })}
            className={cn(
              "hover:text-foreground",
              filtered ? "text-muted-foreground" : "font-medium text-foreground",
            )}
          >
            All posts
          </Link>
          <span aria-hidden className="text-muted-foreground">
            ·
          </span>
          <label className="inline-flex items-baseline gap-1 text-muted-foreground">
            <span className="sr-only">Sort posts</span>
            <select
              value={query.sort}
              onChange={(event) =>
                go({ ...query, sort: event.target.value as FeedQuery["sort"] })
              }
              className="bg-transparent font-medium text-foreground"
            >
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
              <option value="score">Score</option>
            </select>
          </label>
        </p>
      </header>

      <form
        className="mt-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          go({ ...query, q: search.trim() });
        }}
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Post, author, market, or stall"
          className="bg-card"
          aria-label="Find posts"
          onClear={() => {
            if (query.q) go({ ...query, q: "" });
          }}
        />
        <button
          type="submit"
          className="h-8 bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Find
        </button>
      </form>
      {topics.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topics.map((tag) => {
            const on = query.tag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => go({ ...query, tag: on ? "" : tag })}
                className={cn(
                  "stall-chip-sm px-2.5 py-1 text-sm",
                  on
                    ? "bg-primary text-primary-foreground"
                    : "border border-input bg-card text-foreground",
                )}
              >
                {tagLabel(tag)}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="mt-3 text-sm text-muted-foreground">
        {visible.length} {visible.length === 1 ? "post" : "posts"}
        {query.q ? ` for “${query.q}”` : null}
        {marketName ? ` at ${marketName}` : null}
        {vendorName ? ` about ${vendorName}` : null}
        {filtered ? (
          <>
            {" "}
            <Link href="/feed" className="font-medium text-primary hover:underline">
              Clear
            </Link>
          </>
        ) : null}
      </p>

      <div className="mt-4">
        <FloorComposer
          signedIn={signedIn}
          stalls={stalls}
          markets={markets}
          onPosted={(item) => setItems((current) => [item, ...current].slice(0, 80))}
        />
        {visible.length ? (
          <ol>
            {visible.map((item) => (
              <ReviewCard key={item.id} item={item} stalls={stalls} />
            ))}
          </ol>
        ) : (
          <p className="px-3 py-4 text-base text-muted-foreground">
            {filtered
              ? "No posts match that. Clear the search."
              : "No posts yet. Sign in to write the first one."}
          </p>
        )}
      </div>
    </div>
  );
}
