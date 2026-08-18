"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/format";
import type { Post } from "@/types/database";

export function LiveFeed({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("live-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as Post;
          if (row.flagged) return;
          setPosts((current) => {
            if (current.some((p) => p.id === row.id)) return current;
            return [
              {
                ...row,
                author_name: "Someone on the floor",
                photos: row.photos ?? [],
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

  if (!posts.length) {
    return (
      <p className="rounded-xl bg-card p-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
        No live posts yet. When you&apos;re at a market, check in and tell the rest of the country
        what&apos;s on the tables.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {posts.map((post) => (
        <li
          key={post.id}
          className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {post.author_name ?? "Regular"}
              {post.market_slug ? (
                <>
                  {" "}
                  <span className="font-normal text-muted-foreground">at</span>{" "}
                  <Link href={`/markets/${post.market_slug}`} className="text-primary hover:underline">
                    {post.market_name}
                  </Link>
                </>
              ) : null}
            </p>
            <time className="text-xs text-muted-foreground" dateTime={post.created_at}>
              {timeAgo(post.created_at)}
            </time>
          </div>
          <p className="mt-2 text-[0.95rem] leading-relaxed">{post.body}</p>
          {post.photos?.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {post.photos.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="h-32 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : null}
          {post.verified_on_site ? (
            <p className="mt-2 text-xs tracking-wide text-stamp uppercase">On site</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
