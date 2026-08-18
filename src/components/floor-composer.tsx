"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { composeFloorNote } from "@/app/actions/presence";
import { useGeo } from "@/components/geo-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FLOOR_TAGS, isSupabaseConfigured } from "@/lib/constants";
import { NOTE_PROMPTS } from "@/lib/floor-note";
import type { FloorItem, StallRef } from "@/types/database";

export function FloorComposer({
  signedIn,
  stalls,
  onPosted,
}: {
  signedIn: boolean;
  stalls: StallRef[];
  onPosted: (item: FloorItem) => void;
}) {
  const { nearby, coords, error, request } = useGeo();
  const market = nearby[0];
  const demo = !isSupabaseConfigured();
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [vendorId, setVendorId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const prompt = NOTE_PROMPTS[Math.floor(Date.now() / 3_600_000) % NOTE_PROMPTS.length];

  const stallOptions = useMemo(() => {
    if (market) return stalls.filter((s) => s.market_id === market.id);
    return stalls;
  }, [market, stalls]);

  const tagged = stallOptions.find((s) => s.id === vendorId);
  const marketId = market?.id ?? tagged?.market_id;
  const canWrite = demo || (signedIn && Boolean(market && coords));

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  function submit() {
    setMessage(null);
    if (!marketId) {
      setMessage("Pick a vendor from the list, or share your location so we know which market.");
      return;
    }
    if (rating > 0 && body.trim().length < 8) {
      setMessage("Give the next person a little more than a shrug.");
      return;
    }
    start(async () => {
      const pin = coords ?? { lat: 0, lng: 0 };
      const result = await composeFloorNote({
        marketId,
        body,
        lat: pin.lat,
        lng: pin.lng,
        rating,
        vendorId: tagged?.id,
        vendorSlug: tagged?.slug,
        tags,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onPosted({
        id: `local-${Date.now()}`,
        kind: rating > 0 ? "review" : "post",
        body: body.trim(),
        created_at: new Date().toISOString(),
        author_name: "You",
        market_name: market?.name ?? null,
        market_slug: market?.slug ?? null,
        vendor_name: tagged?.name ?? null,
        vendor_slug: tagged?.slug ?? null,
        rating: rating > 0 ? rating : null,
        verified_on_site: Boolean(market),
        tags,
      });
      setBody("");
      setRating(0);
      setVendorId("");
      setTags([]);
      setMessage(result.demo ? "Your note is on the list for now." : "Your note is posted.");
    });
  }

  return (
    <div className="border-b border-border bg-[#f7f3e8] px-3 py-3">
      <p className="text-base font-medium">Write a note or review</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell the next shopper what you saw. Optional: pick a vendor and a star rating.
      </p>
      <Textarea
        className="mt-2 min-h-[4.5rem] bg-[#fbf8ef] text-base"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={prompt}
      />
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating((current) => (current === n ? 0 : n))}
            className={`size-8 rounded-sm text-sm ${
              n <= rating ? "bg-ticket text-[#fbf8ef]" : "bg-background text-muted-foreground"
            }`}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            {n}
          </button>
        ))}
        <span className="ml-1 text-sm text-muted-foreground">
          {rating ? `${rating} out of 5 — this will also save as a review` : "Star rating (optional)"}
        </span>
      </div>
      <label className="mt-3 block text-sm text-muted-foreground">
        Which vendor is this about? (optional)
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-base"
        >
          <option value="">The market in general</option>
          {stallOptions.map((stall) => (
            <option key={`${stall.market_id}-${stall.id}`} value={stall.id}>
              {stall.name}
              {stall.stall ? ` · stall ${stall.stall}` : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-3 text-sm text-muted-foreground">What is it about? (optional)</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {FLOOR_TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-md px-2 py-1 text-sm ${
                on ? "bg-foreground text-background" : "bg-background text-muted-foreground"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!demo && !signedIn ? (
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-base font-medium text-primary-foreground"
          >
            Sign in to post
          </Link>
        ) : !demo && !coords ? (
          <Button type="button" onClick={request}>
            Share my location
          </Button>
        ) : !demo && !market ? (
          <p className="text-sm text-muted-foreground">
            You need to be at a market to post. Browse the page until then.
          </p>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={pending || body.trim().length < 3 || !canWrite}
          >
            {pending ? "Posting…" : rating ? "Post review" : "Post note"}
          </Button>
        )}
        {error ? <span className="text-sm text-destructive">{error}</span> : null}
      </div>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
