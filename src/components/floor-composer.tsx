"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { composeFloorNote } from "@/app/actions/presence";
import { useGeo } from "@/components/geo-provider";
import { ScorePlate } from "@/components/listing-score";
import { PlateMark, TagMark } from "@/components/marks";
import { ReviewSignupOverlay } from "@/components/review-signup-overlay";
import { SearchField } from "@/components/search-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FLOOR_TAGS } from "@/lib/constants";
import { formatPriceLevel } from "@/lib/format";
import { NOTE_PROMPTS } from "@/lib/floor-note";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import { cn } from "@/lib/utils";
import type { FloorItem, StallRef } from "@/types/database";
import type { GeoMarket } from "@/lib/geo";

type Extra = "stars" | "place" | "tags" | null;
type PlaceStep = "market" | "vendor";

const PRICE_CHOICES = [
  { level: 1, hint: "Cheap" },
  { level: 2, hint: "Mid" },
  { level: 3, hint: "A splurge" },
] as const;

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function FloorComposer({
  signedIn: signedInProp = false,
  stalls,
  markets,
  onPosted,
  autoFocus = false,
  initialMarketId,
  initialVendorId,
  className,
}: {
  signedIn?: boolean;
  stalls: Array<Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">>;
  markets: GeoMarket[];
  onPosted: (item: FloorItem) => void;
  autoFocus?: boolean;
  initialMarketId?: string;
  initialVendorId?: string;
  className?: string;
}) {
  const { nearby, coords } = useGeo();
  const here = nearby[0];
  const pathname = usePathname() || "/";
  const cookieIn = useAuthCookie(signedInProp);
  const signedIn = signedInProp || cookieIn;
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(0);
  const [price, setPrice] = useState(0);
  const [marketId, setMarketId] = useState<string | null>(initialMarketId ?? null);
  const [vendorId, setVendorId] = useState(initialVendorId ?? "");
  const [marketQuery, setMarketQuery] = useState("");
  const [vendorQuery, setVendorQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [extra, setExtra] = useState<Extra>(null);
  const [placeStep, setPlaceStep] = useState<PlaceStep>("market");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const marketSearchRef = useRef<HTMLInputElement>(null);
  const vendorSearchRef = useRef<HTMLInputElement>(null);
  const prompt = NOTE_PROMPTS[0] ?? "What should the next shopper know?";

  const picked = marketId ? markets.find((m) => m.id === marketId) ?? null : null;
  const market = marketId === "" ? null : (picked ?? here ?? null);

  const stallOptions = useMemo(() => {
    if (!market) return [];
    return stalls.filter((s) => s.market_id === market.id);
  }, [market, stalls]);

  const tagged = stallOptions.find((s) => s.id === vendorId);
  const canWrite = signedIn;
  const onSite = Boolean(market && nearby.some((item) => item.id === market.id));
  const manyStalls = stallOptions.length > 8;

  const marketMatches = useMemo(() => {
    const q = fold(marketQuery);
    if (!q) return [];
    const tokens = q.split(" ").filter(Boolean);
    return markets
      .filter((item) => {
        const hay = fold(`${item.name} ${item.address}`);
        return tokens.every((token) => hay.includes(token));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [marketQuery, markets]);

  const vendorMatches = useMemo(() => {
    const q = fold(vendorQuery);
    if (!q) return manyStalls ? [] : stallOptions;
    const tokens = q.split(" ").filter(Boolean);
    return stallOptions.filter((s) => {
      const hay = fold(`${s.name} ${s.stall ?? ""}`);
      return tokens.every((token) => hay.includes(token));
    });
  }, [manyStalls, stallOptions, vendorQuery]);

  useEffect(() => {
    if (extra !== "place") return;
    const node = placeStep === "market" ? marketSearchRef.current : vendorSearchRef.current;
    node?.focus();
  }, [extra, placeStep]);

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

  function openPlace() {
    setMarketQuery("");
    setVendorQuery("");
    setPlaceStep(market ? "vendor" : "market");
    setExtra((current) => (current === "place" ? null : "place"));
  }

  function pickMarket(id: string) {
    setMarketId(id);
    setVendorId("");
    setVendorQuery("");
    setPrice(0);
    setPlaceStep("vendor");
  }

  function clearVendor() {
    setVendorId("");
    setPrice(0);
  }

  function pickVendor(id: string) {
    setVendorId(id);
    setExtra(null);
  }

  function skipVendor() {
    clearVendor();
    setExtra(null);
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
      setMessage("Pick a market first.");
      setPlaceStep("market");
      setExtra("place");
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
        priceLevel: tagged ? price : undefined,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onPosted({
        id: `local-${Date.now()}`,
        kind: "review",
        body: body.trim(),
        created_at: new Date().toISOString(),
        author_name: "You",
        market_name: market.name,
        market_slug: market.slug,
        vendor_name: tagged?.name ?? null,
        vendor_slug: tagged?.slug ?? null,
        rating: rating > 0 ? rating : null,
        price_level: tagged && price > 0 ? price : null,
        verified_on_site: onSite,
        tags,
        photos: [],
      });
      setBody("");
      setRating(0);
      setPrice(0);
      setVendorId("");
      setTags([]);
      setMessage("Your review is up.");
    });
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative z-10 shrink-0 rounded-md border border-input bg-card focus-within:border-ring",
        className,
      )}
    >
      <label className="block px-3 pt-3 text-sm font-medium" htmlFor="floor-post">
        Write a review
      </label>
      <div className="relative">
        <Textarea
          id="floor-post"
          className="min-h-[5.5rem] max-h-40 resize-none border-0 bg-transparent px-3 py-2 text-base shadow-none md:text-base focus-visible:border-transparent focus-visible:ring-0"
          rows={3}
          autoFocus={autoFocus && signedIn}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={prompt}
          readOnly={!signedIn}
          tabIndex={signedIn ? undefined : -1}
        />
        {signedIn ? null : <ReviewSignupOverlay next={pathname} />}
      </div>

      {rating || market || tagged || tags.length ? (
        <ul className="flex flex-wrap gap-1 px-3 pb-2">
          {rating ? (
            <li className="stall-chip-sm inline-flex overflow-hidden bg-ticket text-foreground">
              <button
                type="button"
                onClick={() => setExtra("stars")}
                className="type-nums px-2 py-0.5 text-sm"
              >
                {rating}
              </button>
              <button
                type="button"
                aria-label="Remove score"
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
                onClick={openPlace}
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
                  setPrice(0);
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
                onClick={openPlace}
                className="px-2 py-0.5 text-sm"
              >
                {tagged.name}
              </button>
              <button
                type="button"
                aria-label="Remove vendor"
                onClick={clearVendor}
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

      <div className="flex flex-wrap items-center gap-1 border-t border-border bg-secondary px-2 py-1.5">
        <button
          type="button"
          aria-label="Score"
          aria-expanded={extra === "stars"}
          onClick={() => setExtra((current) => (current === "stars" ? null : "stars"))}
          className={cn(
            "stall-chip-sm type-nums inline-flex h-8 min-w-8 items-center justify-center px-2 text-sm",
            extra === "stars" || rating
              ? "bg-ticket text-foreground"
              : "bg-secondary text-muted-foreground hover:bg-muted",
          )}
        >
          {rating || "–"}
        </button>
        <ExtraButton
          label="Market"
          open={extra === "place"}
          onClick={openPlace}
        >
          <PlateMark className={cn("size-4", market ? "text-primary" : "")} />
        </ExtraButton>
        <ExtraButton
          label="Topic"
          open={extra === "tags"}
          onClick={() => setExtra((current) => (current === "tags" ? null : "tags"))}
        >
          <TagMark className="size-4" />
        </ExtraButton>
        {tagged ? (
          <div className="flex items-center" role="group" aria-label="Price">
            {PRICE_CHOICES.map((choice) => {
              const on = price === choice.level;
              return (
                <button
                  key={choice.level}
                  type="button"
                  aria-label={choice.hint}
                  aria-pressed={on}
                  title={choice.hint}
                  onClick={() =>
                    setPrice((current) => (current === choice.level ? 0 : choice.level))
                  }
                  className={cn(
                    "flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 type-nums text-sm",
                    on
                      ? "bg-ticket text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {formatPriceLevel(choice.level)}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="ml-auto flex min-w-0 items-center gap-1">
          {!signedIn ? (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-full px-4")}
            >
              Sign in
            </Link>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={submit}
              disabled={pending || body.trim().length < 3 || !canWrite || !market}
              className="h-8 rounded-full px-4"
            >
              {pending ? "…" : "Review"}
            </Button>
          )}
        </div>
      </div>

      {extra === "stars" ? (
        <ExtraPanel title="Score" hint="Optional. Click outside the box to keep it on this review.">
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating((current) => (current === n ? 0 : n))}
                aria-pressed={n === rating}
                aria-label={`${n} out of 5`}
              >
                <ScorePlate
                  className={
                    n === rating
                      ? undefined
                      : "bg-secondary text-muted-foreground"
                  }
                >
                  {n}
                </ScorePlate>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {rating ? `${rating} out of 5` : "Optional. Leave off if you just have something to say."}
          </p>
        </ExtraPanel>
      ) : null}

      {extra === "place" ? (
        <div className="absolute inset-x-2 top-[calc(100%-0.25rem)] z-20 rounded-md bg-card p-3 shadow-md ring-1 ring-border">
          {placeStep === "market" ? (
            <MarketStep
              query={marketQuery}
              onQuery={setMarketQuery}
              searchRef={marketSearchRef}
              here={here}
              current={market}
              matches={marketMatches}
              onPick={pickMarket}
              onKeep={market ? () => setPlaceStep("vendor") : undefined}
            />
          ) : market ? (
            <VendorStep
              marketName={market.name}
              query={vendorQuery}
              onQuery={setVendorQuery}
              searchRef={vendorSearchRef}
              many={manyStalls}
              matches={vendorMatches}
              taggedId={tagged?.id}
              taggedName={tagged?.name}
              stallCount={stallOptions.length}
              onPick={pickVendor}
              onSkip={skipVendor}
              onChangeMarket={() => {
                setMarketQuery("");
                setPlaceStep("market");
              }}
            />
          ) : null}
        </div>
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

      {message ? (
        <p className="px-3 pb-2 text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

function MarketStep({
  query,
  onQuery,
  searchRef,
  here,
  current,
  matches,
  onPick,
  onKeep,
}: {
  query: string;
  onQuery: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  here?: GeoMarket;
  current: GeoMarket | null;
  matches: GeoMarket[];
  onPick: (id: string) => void;
  onKeep?: () => void;
}) {
  const searching = fold(query).length > 0;

  return (
    <>
      <p className="text-base font-medium">Which market?</p>
      <p className="mb-2 text-sm text-muted-foreground">Type the name. Results show as you type.</p>
      <SearchField
        id="floor-market-search"
        ref={searchRef}
        value={query}
        onChange={onQuery}
        placeholder="Wychwood, Junction, St. Lawrence…"
        className="h-9 bg-background text-base md:text-base"
      />
      <div className="mt-2 max-h-44 overflow-y-auto">
        {!searching && current && onKeep ? (
          <PickRow selected onClick={onKeep}>
            Keep {current.name}
          </PickRow>
        ) : null}
        {!searching && here && here.id !== current?.id ? (
          <PickRow onClick={() => onPick(here.id)}>
            {here.name}
            <span className="mt-0.5 block font-normal text-sm text-muted-foreground">Near you</span>
          </PickRow>
        ) : null}
        {searching ? (
          matches.length ? (
            matches.map((item) => (
              <PickRow
                key={item.id}
                selected={current?.id === item.id}
                onClick={() => onPick(item.id)}
              >
                {item.name}
              </PickRow>
            ))
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No markets match that.</p>
          )
        ) : null}
      </div>
    </>
  );
}

function VendorStep({
  marketName,
  query,
  onQuery,
  searchRef,
  many,
  matches,
  taggedId,
  taggedName,
  stallCount,
  onPick,
  onSkip,
  onChangeMarket,
}: {
  marketName: string;
  query: string;
  onQuery: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  many: boolean;
  matches: Array<Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">>;
  taggedId?: string;
  taggedName?: string;
  stallCount: number;
  onPick: (id: string) => void;
  onSkip: () => void;
  onChangeMarket: () => void;
}) {
  const searching = fold(query).length > 0;

  return (
    <>
      <p className="text-base font-medium">
        {marketName}{" "}
        <button
          type="button"
          onClick={onChangeMarket}
          className="text-sm font-normal text-primary hover:underline"
        >
          Change
        </button>
      </p>
      <p className="mt-3 text-base font-medium">A stall?</p>
      <p className="mb-2 text-sm text-muted-foreground">
        {stallCount ? "Optional. Skip if this post is about the market." : "No stalls listed yet."}
      </p>
      {stallCount ? (
        <>
          {many || stallCount > 5 ? (
            <SearchField
              id="floor-vendor-search"
              ref={searchRef}
              value={query}
              onChange={onQuery}
              placeholder="Find a stall"
              className="h-9 bg-background text-base md:text-base"
            />
          ) : null}
          <div className="mt-2 max-h-44 overflow-y-auto">
            {many && !searching && taggedId && taggedName ? (
              <PickRow selected onClick={() => onPick(taggedId)}>
                Keep {taggedName}
              </PickRow>
            ) : null}
            {many && !searching ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                Type a few letters to find one.
              </p>
            ) : matches.length ? (
              matches.map((stall) => (
                <PickRow
                  key={`${stall.market_id}-${stall.id}`}
                  selected={taggedId === stall.id}
                  onClick={() => onPick(stall.id)}
                >
                  {stall.name}
                  {stall.stall ? (
                    <span
                      className={cn(
                        "type-nums ml-1 text-sm",
                        taggedId === stall.id ? "text-receipt/80" : "text-muted-foreground",
                      )}
                    >
                      {stall.stall}
                    </span>
                  ) : null}
                </PickRow>
              ))
            ) : searching ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No stalls match that.</p>
            ) : null}
          </div>
        </>
      ) : null}
      <button
        type="button"
        onClick={onSkip}
        className="mt-2 w-full rounded-md bg-secondary px-2 py-2 text-sm font-medium hover:bg-muted"
      >
        Skip, just the market
      </button>
    </>
  );
}

function PickRow({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full rounded-md px-2 py-1.5 text-left text-base font-medium",
        selected ? "bg-foreground text-receipt" : "hover:bg-secondary",
      )}
    >
      {children}
    </button>
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
        "flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary",
        open && "bg-primary/10 text-primary",
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
      <p className="text-base font-medium">{title}</p>
      <p className="mb-2 text-sm text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}
