import Link from "next/link";
import { ReviewScore } from "@/components/listing-score";
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
    <Link href={href} prefetch={false} className="text-primary hover:underline">
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
    <li className={cn("border-b border-border px-3 py-3 hover:bg-muted/50", className)}>
      <p className="flex flex-wrap items-baseline gap-x-1 text-sm leading-snug text-muted-foreground">
        <span className="text-base font-medium text-foreground">
          {item.author_name ?? "A shopper"}
        </span>
        {vendor ? (
          <>
            <span aria-hidden>·</span>
            <PlaceLink href={vendorHref}>{vendor}</PlaceLink>
          </>
        ) : null}
        {market ? (
          <>
            <span aria-hidden>·</span>
            <PlaceLink href={marketHref}>{market}</PlaceLink>
          </>
        ) : null}
        {score ? (
          <>
            <span aria-hidden>·</span>
            <ReviewScore value={score} />
          </>
        ) : null}
        {price ? (
          <>
            <span aria-hidden>·</span>
            <span className="font-mono tabular-nums text-stamp">{price}</span>
          </>
        ) : null}
        {item.verified_on_site ? (
          <>
            <span aria-hidden>·</span>
            <span>On site</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <time className="font-mono tabular-nums" dateTime={item.created_at}>
          {timeAgo(item.created_at)}
        </time>
      </p>
      <p className="mt-1 text-base leading-snug">{item.body}</p>
      {item.tags.length ? (
        <p className="mt-1 text-sm">
          {item.tags.map((tag, index) => (
            <span key={tag}>
              {index > 0 ? " " : null}
              <Link href={`/feed?tag=${encodeURIComponent(tag)}`} className="text-primary hover:underline">
                {tagLabel(tag)}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      {item.photos?.length ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {item.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-32 w-full object-cover" />
          ))}
        </div>
      ) : null}
    </li>
  );
}
