"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Hash, MapPin, Star, Store } from "lucide-react";
import { composeFloorNote } from "@/app/actions/presence";
import { useGeo } from "@/components/geo-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FLOOR_TAGS, isSupabaseConfigured } from "@/lib/constants";
import { NOTE_PROMPTS } from "@/lib/floor-note";
import { cn } from "@/lib/utils";
import type { FloorItem, Market, StallRef } from "@/types/database";

type Extra = "stars" | "place" | "tags" | null;

export function FloorComposer({
  signedIn,
  stalls,
  markets,
  onPosted,
}: {
  signedIn: boolean;
  stalls: StallRef[];
  markets: Market[];
  onPosted: (item: FloorItem) => void;
}) {
  const { nearby, coords, error, request } = useGeo();
  const here = nearby[0];
  const demo = !isSupabaseConfigured();
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [marketId, setMarketId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [marketQuery, setMarketQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [extra, setExtra] = useState<Extra>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const prompt = NOTE_PROMPTS[Math.floor(Date.now() / 3_600_000) % NOTE_PROMPTS.length];

  const picked = marketId ? markets.find((m) => m.id === marketId) ?? null : null;
  const market = marketId === "" ? null : (picked ?? here ?? null);

  const stallOptions = useMemo(() => {
    if (!market) return [];
    return stalls.filter((s) => s.market_id === market.id);
  }, [market, stalls]);

  const tagged = stallOptions.find((s) => s.id === vendorId);
  const canWrite = demo || signedIn;
  const onSite = Boolean(market && nearby.some((item) => item.id === market.id));

  const marketMatches = useMemo(() => {
    const q = marketQuery.trim().toLowerCase();
    const list = q
      ? markets.filter((m) =>
          `${m.name} ${m.address}`.toLowerCase().includes(q),
        )
      : markets;
    return [...list].sort((a, b) => {
      if (here) {
        if (a.id === here.id) return -1;
        if (b.id === here.id) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [here, marketQuery, markets]);

  const vendorMatches = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase();
    if (!q) return stallOptions;
    return stallOptions.filter((s) =>
      `${s.name} ${s.stall ?? ""}`.toLowerCase().includes(q),
    );
  }, [stallOptions, vendorQuery]);

  useEffect(() => {
    if (extra !== "place") return;
    document.getElementById("floor-market-search")?.focus();
  }, [extra]);

  useEffect(() => {
    if (!extra) return;
    function close(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setExtra(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setExtra(null);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [extra]);

  function pickMarket(id: string) {
    setMarketId(id);
    setVendorId("");
    setVendorQuery("");
  }

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  function submit() {
    setMessage(null);
    setExtra(null);
    if (!market) {
      setMessage("Search for a market first. Vendor is optional.");
      return;
    }
    if (rating > 0 && body.trim().length < 8) {
      setMessage("Give the next person a little more than a shrug.");
      return;
    }
    start(async () => {
      const result = await composeFloorNote({
        marketId: market.id,
        body,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
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
        market_name: market.name,
        market_slug: market.slug,
        vendor_name: tagged?.name ?? null,
        vendor_slug: tagged?.slug ?? null,
        rating: rating > 0 ? rating : null,
        verified_on_site: onSite,
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
    <div
      ref={wrapRef}
      className="relative z-10 shrink-0 border-b border-border bg-card px-2 py-2"
    >
      <label className="sr-only" htmlFor="floor-note">
        Write a note or review
      </label>
      <Textarea
        id="floor-note"
        className="min-h-10 max-h-24 resize-none bg-transparent px-2 py-1.5 text-base shadow-none"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={prompt}
      />

      {rating || market || tagged || tags.length ? (
        <ul className="mt-1.5 flex flex-wrap gap-1 px-1">
          {rating ? (
            <li className="stall-chip-sm inline-flex overflow-hidden bg-ticket text-receipt">
              <button
                type="button"
                onClick={() => setExtra("stars")}
                className="px-2 py-0.5 text-sm"
              >
                {rating} / 5
              </button>
              <button
                type="button"
                aria-label="Remove rating"
                onClick={() => setRating(0)}
                className="px-1.5 text-sm opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </li>
          ) : null}
          {market ? (
            <li className="stall-chip-sm inline-flex overflow-hidden bg-board text-chalk">
              <button
                type="button"
                onClick={() => setExtra("place")}
                className="px-2 py-0.5 text-sm"
              >
                {market.name}
              </button>
              <button
                type="button"
                aria-label="Remove market"
                onClick={() => {
                  setMarketId("");
                  setVendorId("");
                }}
                className="px-1.5 text-sm opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </li>
          ) : null}
          {tagged ? (
            <li className="stall-chip-sm inline-flex overflow-hidden bg-foreground text-receipt">
              <button
                type="button"
                onClick={() => setExtra("place")}
                className="px-2 py-0.5 text-sm"
              >
                {tagged.name}
              </button>
              <button
                type="button"
                aria-label="Remove vendor"
                onClick={() => setVendorId("")}
                className="px-1.5 text-sm opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </li>
          ) : null}
          {tags.map((tag) => (
            <li key={tag} className="stall-chip-sm inline-flex overflow-hidden bg-primary text-primary-foreground">
              <button
                type="button"
                onClick={() => setExtra("tags")}
                className="px-2 py-0.5 text-sm"
              >
                {tag}
              </button>
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => toggleTag(tag)}
                className="px-1.5 text-sm opacity-80 hover:opacity-100"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-1.5 flex items-center gap-1 px-1">
        <ExtraButton
          label="Stars"
          open={extra === "stars"}
          onClick={() => setExtra((current) => (current === "stars" ? null : "stars"))}
        >
          <Star className={cn("size-4", rating ? "fill-ticket text-ticket" : "")} />
        </ExtraButton>
        <ExtraButton
          label="Market"
          open={extra === "place"}
          onClick={() => setExtra((current) => (current === "place" ? null : "place"))}
        >
          <MapPin className={cn("size-4", market ? "text-primary" : "")} />
        </ExtraButton>
        <ExtraButton
          label="Topic"
          open={extra === "tags"}
          onClick={() => setExtra((current) => (current === "tags" ? null : "tags"))}
        >
          <Hash className="size-4" />
        </ExtraButton>
        <div className="ml-auto flex min-w-0 items-center gap-1">
          {!demo && !signedIn ? (
            <Link
              href="/login"
              className="inline-flex h-8 items-center rounded-md bg-primary px-2 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </Link>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={pending || body.trim().length < 3 || !canWrite || !market}
            >
              {pending ? "…" : rating ? "Review" : "Post"}
            </Button>
          )}
        </div>
      </div>

      {extra === "stars" ? (
        <ExtraPanel title="Star rating" hint="Click outside the box to save it on this note.">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating((current) => (current === n ? 0 : n))}
                className={cn(
                  "flex size-9 items-center justify-center rounded-md text-sm",
                  n <= rating ? "bg-ticket text-receipt" : "bg-secondary text-muted-foreground",
                )}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {rating ? `${rating} out of 5 — this posts as a review` : "Optional. Leave at 0 for a plain note."}
          </p>
        </ExtraPanel>
      ) : null}

      {extra === "place" ? (
        <ExtraPanel
          title="Which market?"
          hint="Search for the market first. A vendor is optional."
        >
          <Input
            id="floor-market-search"
            type="search"
            value={marketQuery}
            onChange={(e) => setMarketQuery(e.target.value)}
            placeholder="Wychwood, Junction, St. Lawrence…"
            className="h-9 bg-background text-base"
          />
          <div className="mt-2 max-h-36 overflow-y-auto">
            {marketMatches.length ? (
              marketMatches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pickMarket(item.id)}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-sm",
                    market?.id === item.id ? "bg-foreground text-receipt" : "hover:bg-secondary",
                  )}
                >
                  <span className="block font-medium">{item.name}</span>
                  <span
                    className={cn(
                      "block text-xs",
                      market?.id === item.id ? "text-receipt/80" : "text-muted-foreground",
                    )}
                  >
                    {item.address}
                    {here?.id === item.id ? " · near you" : ""}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No markets match that.</p>
            )}
          </div>

          {market ? (
            <div className="mt-3 border-t border-border pt-3">
              {onSite ? (
                <p className="mb-3 text-sm text-muted-foreground">
                  You shared your location. This note will show as posted at the market.
                </p>
              ) : (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground">
                    Optional. Share location only if you want an on-site stamp.
                  </p>
                  <Button type="button" size="sm" variant="outline" className="mt-2" onClick={request}>
                    I&apos;m at this market
                  </Button>
                  {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
                  {coords && !onSite ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      You&apos;re not close enough for that stamp. You can still post.
                    </p>
                  ) : null}
                </div>
              )}
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Store className="size-3.5" aria-hidden />
                Vendor at this market
              </p>
              <p className="mb-2 text-sm text-muted-foreground">Optional. Skip this if the note is about the market.</p>
              {stallOptions.length > 5 ? (
                <Input
                  type="search"
                  value={vendorQuery}
                  onChange={(e) => setVendorQuery(e.target.value)}
                  placeholder="Search a stall"
                  className="mb-2 h-9 bg-background text-base"
                />
              ) : null}
              <div className="max-h-32 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setVendorId("")}
                  className={cn(
                    "block w-full rounded-md px-2 py-1.5 text-left text-sm",
                    !vendorId ? "bg-foreground text-receipt" : "hover:bg-secondary",
                  )}
                >
                  Just the market
                </button>
                {vendorMatches.map((stall) => (
                  <button
                    key={`${stall.market_id}-${stall.id}`}
                    type="button"
                    onClick={() => setVendorId(stall.id)}
                    className={cn(
                      "block w-full rounded-md px-2 py-1.5 text-left text-sm",
                      vendorId === stall.id ? "bg-foreground text-receipt" : "hover:bg-secondary",
                    )}
                  >
                    {stall.name}
                    {stall.stall ? (
                      <span className="ml-1 text-muted-foreground">· {stall.stall}</span>
                    ) : null}
                  </button>
                ))}
                {!vendorMatches.length ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">No stalls match that.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </ExtraPanel>
      ) : null}

      {extra === "tags" ? (
        <ExtraPanel title="What is it about?" hint="Tap topics, then click outside the box to save them.">
          <div className="flex flex-wrap gap-1">
            {FLOOR_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "stall-chip-sm px-2 py-1 text-sm",
                    on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </ExtraPanel>
      ) : null}

      {message ? <p className="mt-1 px-1 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function ExtraButton({
  label,
  open,
  onClick,
  children,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground",
        open && "bg-secondary text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ExtraPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-x-2 top-[calc(100%-0.25rem)] z-20 rounded-md bg-card p-3 shadow-md ring-1 ring-border">
      <p className="font-medium">{title}</p>
      <p className="mb-2 text-sm text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
