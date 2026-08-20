import Link from "next/link";
import { AsteriskMark, TagMark } from "@/components/marks";
import { scrapStyle } from "@/lib/floor-note";
import { tagLabel } from "@/lib/find-paths";
import { formatPriceLevel, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FloorItem, StallRef } from "@/types/database";

function PlaceLink({
  href,
  children,
}: {
  href: string | null;
  children: string;
}) {
  if (!href) return children;
  return (
    <Link href={href} className="text-primary hover:underline">
      {children}
    </Link>
  );
}

export function ReviewCard({
  item,
  stalls = [],
  className,
}: {
  item: FloorItem;
  stalls?: StallRef[];
  className?: string;
}) {
  const vendor =
    item.vendor_name ?? stalls.find((s) => s.slug === item.vendor_slug)?.name ?? null;
  const vendorHref = item.vendor_slug ? `/vendors/${item.vendor_slug}` : null;
  const marketHref = item.market_slug ? `/markets/${item.market_slug}` : null;
  const market = item.market_name;
  const price = formatPriceLevel(item.price_level);
  const score = item.rating != null && item.rating >= 1 ? item.rating : null;

  return (
    <li className={cn("floor-scrap", scrapStyle(item.id), className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-base font-medium">
          {item.author_name ?? "A shopper"}
        </p>
        <time
          className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground"
          dateTime={item.created_at}
        >
          {timeAgo(item.created_at)}
        </time>
      </div>

      {vendor || market ? (
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
          {vendor ? <PlaceLink href={vendorHref}>{vendor}</PlaceLink> : null}
          {vendor && market ? " · " : null}
          {market ? <PlaceLink href={marketHref}>{market}</PlaceLink> : null}
        </p>
      ) : null}

      {score || price ? (
        <p className="mt-2 flex flex-wrap items-center gap-2">
          {score ? (
            <span className="inline-flex items-center gap-px" aria-label={`${score} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <AsteriskMark
                  key={n}
                  className={cn(
                    "size-3.5",
                    n <= score ? "text-stamp" : "text-foreground/20",
                  )}
                />
              ))}
            </span>
          ) : null}
          {price ? (
            <span className="font-mono text-sm tabular-nums text-stamp">{price}</span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-2 text-base leading-relaxed">{item.body}</p>

      {item.photos?.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {item.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-32 w-full object-cover" />
          ))}
        </div>
      ) : null}

      {item.tags.length || item.verified_on_site ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {item.tags.length ? (
            <ul className="flex min-w-0 flex-wrap gap-1">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="stall-chip-sm inline-flex items-center gap-1 bg-primary px-1.5 py-0.5 text-sm text-primary-foreground"
                >
                  <TagMark className="size-3" />
                  {tagLabel(tag)}
                </li>
              ))}
            </ul>
          ) : null}
          {item.verified_on_site ? (
            <p className="ml-auto -rotate-[2deg] text-sm font-medium text-stamp">On site</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
