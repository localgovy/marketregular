"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FloorComposer } from "@/components/floor-composer";
import { NowLabel } from "@/components/now-label";
import { ReviewCard } from "@/components/review-card";
import { Input } from "@/components/ui/input";
import {
  feedIsFiltered,
  feedSearchString,
  filterFeed,
  mentionPlaces,
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
    onSite: params.get("onSite") ?? undefined,
    sort: params.get("sort") ?? undefined,
  });
}

export function FeedBoard({
  initialItems,
  signedIn,
  stalls,
  markets,
  openSlugs,
}: {
  initialItems: FloorItem[];
  signedIn: boolean;
  stalls: StallRef[];
  markets: Market[];
  openSlugs: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const query = useMemo(() => queryFromParams(params), [params]);
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState(query.q);
  const open = useMemo(() => new Set(openSlugs), [openSlugs]);

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
  const mentions = useMemo(() => mentionPlaces(visible), [visible]);
  const openMentions = mentions.markets.filter((place) => open.has(place.slug));
  const filtered = feedIsFiltered(query);
  const marketName = query.market
    ? (markets.find((m) => m.slug === query.market)?.name ?? query.market)
    : "";
  const vendorName = query.vendor
    ? (stalls.find((s) => s.slug === query.vendor)?.name ?? query.vendor)
    : "";

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="min-w-0">
        <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-3">
          <h2 className="type-column">Reviews</h2>
          <p className="flex flex-wrap items-baseline gap-x-1 text-sm">
            <Link
              href={feedSearchString({ ...query, q: "", market: "", vendor: "", tag: "", onSite: false })}
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
            <button
              type="button"
              onClick={() => go({ ...query, onSite: !query.onSite })}
              className={cn(
                "hover:text-foreground",
                query.onSite ? "font-medium text-ticket-ink" : "text-muted-foreground",
              )}
            >
              On site
            </button>
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
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Post, author, market, or stall"
            className="min-w-0 flex-1 bg-card"
            autoComplete="off"
            aria-label="Find posts"
          />
          <button
            type="submit"
            className="h-8 bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Find
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => go({ ...query, onSite: !query.onSite })}
            className={cn(
              "stall-chip-sm px-2.5 py-1 text-sm",
              query.onSite
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-card text-foreground",
            )}
          >
            On site
          </button>
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
              No posts match that. Clear the search or pick a place from the rail.
            </p>
          )}
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <h2 className="type-column">In this feed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Halls and stalls these posts name. Tap one to stay on Feed.
        </p>
        {mentions.markets.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-medium">Markets</h3>
            <ul className="mt-1">
              {mentions.markets.map((place) => (
                <li key={place.slug}>
                  <Link
                    href={feedSearchString({ ...query, market: place.slug, vendor: "" })}
                    scroll={false}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5 text-sm hover:text-primary"
                  >
                    <span>
                      <span className="font-medium">{place.name}</span>
                      {open.has(place.slug) ? (
                        <>
                          {" "}
                          <NowLabel className="align-middle">Open</NowLabel>
                        </>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                      {place.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {mentions.vendors.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-medium">Stalls</h3>
            <ul className="mt-1">
              {mentions.vendors.map((place) => (
                <li key={place.slug}>
                  <Link
                    href={feedSearchString({ ...query, vendor: place.slug, market: "" })}
                    scroll={false}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5 text-sm hover:text-primary"
                  >
                    <span className="font-medium">{place.name}</span>
                    <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                      {place.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {openMentions.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-medium">Open now</h3>
            <ul className="mt-1">
              {openMentions.map((place) => (
                <li key={place.slug}>
                  <Link
                    href={feedSearchString({ ...query, market: place.slug, vendor: "" })}
                    scroll={false}
                    className="flex items-baseline gap-2 py-1.5 text-sm hover:text-primary"
                  >
                    <span className="font-medium">{place.name}</span>
                    <NowLabel>Open</NowLabel>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {!mentions.markets.length && !mentions.vendors.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No halls or stalls on these posts yet.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
