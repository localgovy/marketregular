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
      setMessage("Tag a stall or share location so we know which floor.");
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
      setMessage(result.demo ? "Pinned to this tape for now." : "On the tape.");
    });
  }

  return (
    <div className="border-b border-border bg-[#f7f3e8] px-3 py-3">
      <p className="font-heading text-[15px] leading-tight">Got a dispatch?</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        A note for whoever&apos;s walking in next. Tag a stall if you know it.
      </p>
      <Textarea
        className="mt-2 min-h-[4.5rem] bg-[#fbf8ef] text-[13px]"
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
            className={`size-6 rounded-sm text-xs ${
              n <= rating ? "bg-ticket text-[#fbf8ef]" : "bg-background text-muted-foreground"
            }`}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            {n}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-muted-foreground">
          {rating ? "Saved as a review too" : "Optional score"}
        </span>
      </div>
      <label className="mt-2 block text-[11px] text-muted-foreground">
        Tag a stall
        <select
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">No stall — just the hall</option>
          {stallOptions.map((stall) => (
            <option key={`${stall.market_id}-${stall.id}`} value={stall.id}>
              {stall.name}
              {stall.stall ? ` · ${stall.stall}` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        {FLOOR_TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-sm px-1.5 py-0.5 text-[10px] tracking-wide uppercase ${
                on ? "bg-foreground text-background" : "bg-background text-muted-foreground"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {!demo && !signedIn ? (
          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            Sign in to post
          </Link>
        ) : !demo && !coords ? (
          <Button type="button" size="sm" onClick={request}>
            Share location
          </Button>
        ) : !demo && !market ? (
          <p className="text-[11px] text-muted-foreground">Walk into a market to stamp the tape.</p>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending || body.trim().length < 3 || !canWrite}
          >
            {pending ? "Pinning…" : rating ? "Pin review" : "Pin to the tape"}
          </Button>
        )}
        {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
      </div>
      {message ? <p className="mt-1.5 text-[11px] text-muted-foreground">{message}</p> : null}
    </div>
  );
}
