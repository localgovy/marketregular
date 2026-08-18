"use client";

import { useState, useTransition } from "react";
import { createPost, createReview } from "@/app/actions/presence";
import { useGeo } from "@/components/geo-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistance } from "@/lib/geo";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

export function CheckInPanel({
  signedIn,
  compact = false,
}: {
  signedIn: boolean;
  compact?: boolean;
}) {
  const { nearby, coords, error, request } = useGeo();
  const market = nearby[0];
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [mode, setMode] = useState<"post" | "review">("post");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<File[]>([]);

  if (!coords) {
    return (
      <div
        className={
          compact
            ? "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            : "rounded-xl bg-card p-5 ring-1 ring-foreground/10"
        }
      >
        <div className="min-w-0">
          <p className={compact ? "text-base font-medium" : "font-heading text-lg"}>
            Are you at a market?
          </p>
          {!compact ? (
            <p className="mt-1 text-base text-muted-foreground">
              Share your location to post a note or review while you are there. We only save that you
              were at the market — not your exact pin on a map.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Press the button so we can confirm you are at a market. Then you can post.
            </p>
          )}
          {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
        </div>
        <Button className={compact ? "" : "mt-4"} onClick={request} type="button">
          Share my location
        </Button>
      </div>
    );
  }

  if (!market) {
    if (compact) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-card px-3 py-2.5">
          <p className="text-base font-medium">You are not at a market right now</p>
          <p className="text-sm text-muted-foreground">
            You can still search and read notes. Posting is only for people who are actually at a market.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="font-heading text-lg">On the floor?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re not inside a market fence. Open a listing, or come back when you&apos;re there.
        </p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  const pin = coords;
  const stall = market;

  async function uploadPhotos() {
    if (!files.length) return [];
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return [];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const urls: string[] = [];
    for (const file of files.slice(0, 4)) {
      const path = `${user.id}/${Date.now()}-${file.name.replaceAll(" ", "-")}`;
      const { error } = await supabase.storage.from("post-photos").upload(path, file, {
        upsert: false,
      });
      if (error) continue;
      urls.push(supabase.storage.from("post-photos").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  function submit() {
    setMessage(null);
    start(async () => {
      if (mode === "post") {
        const photos = await uploadPhotos();
        const result = await createPost({
          marketId: stall.id,
          body,
          lat: pin.lat,
          lng: pin.lng,
          photos,
        });
        setMessage(result.error ?? "Posted to the live feed.");
        if (!result.error) {
          setBody("");
          setFiles([]);
        }
      } else {
        const result = await createReview({
          marketId: stall.id,
          rating,
          body,
          lat: pin.lat,
          lng: pin.lng,
        });
        setMessage(result.error ?? "Review published.");
        if (!result.error) setBody("");
      }
    });
  }

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-border bg-card px-3 py-3"
          : "rounded-xl bg-card p-5 ring-1 ring-foreground/10"
      }
    >
      <p className="text-xs tracking-wide text-primary uppercase">You&apos;re at</p>
      <Link
        href={`/markets/${stall.slug}`}
        className={compact ? "text-base font-medium hover:underline" : "font-heading text-2xl hover:underline"}
      >
        {stall.name}
      </Link>
      <p className="text-sm text-muted-foreground">
        {formatDistance(stall.distance)} from the stall map pin
      </p>
      {!signedIn ? (
        <Link href="/login" className="mt-4 inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground">
          Sign in to post
        </Link>
      ) : compact ? (
        <p className="mt-2 text-sm text-muted-foreground">
          You are close enough to post. Use the “Write a note” box in the notes column.
        </p>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "post" ? "default" : "outline"}
              onClick={() => setMode("post")}
            >
              Live post
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "review" ? "default" : "outline"}
              onClick={() => setMode("review")}
            >
              Review
            </Button>
          </div>
          {mode === "review" ? (
            <div className="mt-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`size-8 rounded-md text-sm ${n <= rating ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}
          <Textarea
            className="mt-3"
            rows={compact ? 2 : 4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              mode === "post"
                ? "What's on the tables right now?"
                : "What should someone know before they come?"
            }
          />
          {mode === "post" && !compact ? (
            <input
              className="mt-2 text-sm"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          ) : null}
          <Button className="mt-3" onClick={submit} disabled={pending || body.trim().length < 3}>
            {pending ? "Sending…" : mode === "post" ? "Post to the feed" : "Publish review"}
          </Button>
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
        </>
      )}
    </div>
  );
}
