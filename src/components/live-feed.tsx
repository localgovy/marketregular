"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { decodeFloorBody, floorKicker, scrapStyle } from "@/lib/floor-note";
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
      <p className="font-heading text-sm text-muted-foreground">
        Quiet in this hall. Stamp in and leave the first note.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {posts.map((post) => {
        const decoded = decodeFloorBody(post.body);
        return (
          <li
            key={post.id}
            className={`rounded-sm px-4 py-3 shadow-[1px_2px_0_rgba(23,22,20,0.06)] ${scrapStyle(post.id)}`}
          >
            <p className="font-heading text-[13px] text-ticket italic">
              {floorKicker({ kind: "post", id: post.id, rating: null })}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{post.author_name ?? "A regular"}</span>
                {post.market_slug ? (
                  <>
                    {" "}
                    at{" "}
                    <Link href={`/markets/${post.market_slug}`} className="text-primary hover:underline">
                      {post.market_name}
                    </Link>
                  </>
                ) : null}
              </p>
              <time className="text-[11px] text-muted-foreground" dateTime={post.created_at}>
                {timeAgo(post.created_at)}
              </time>
            </div>
            <p className="mt-2 font-heading text-[1.02rem] leading-snug">{decoded.body}</p>
            {decoded.tags.length ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {decoded.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-[2px] bg-foreground/90 px-1.5 py-px text-[9px] tracking-[0.12em] text-receipt uppercase"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
            {post.photos?.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {post.photos.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="h-32 w-full rounded-sm object-cover"
                  />
                ))}
              </div>
            ) : null}
            {post.verified_on_site ? (
              <p className="mt-2 inline-block -rotate-[2deg] border border-stamp px-1.5 py-px text-[9px] font-medium tracking-[0.16em] text-stamp uppercase">
                On site
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
