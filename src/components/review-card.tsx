import Link from "next/link";
import { scrapStyle } from "@/lib/floor-note";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FloorItem, StallRef } from "@/types/database";

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
  const vendorSlug = item.vendor_slug;
  const vendorHref = vendorSlug ? `/vendors/${vendorSlug}` : null;
  const marketHref = item.market_slug ? `/markets/${item.market_slug}` : null;
  const placeHref = vendorHref ?? marketHref;
  const place = vendor ?? item.market_name;

  return (
    <li
      className={cn(
        "rounded-sm px-4 py-3 shadow-[1px_2px_0_rgba(23,22,20,0.06)]",
        scrapStyle(item.id),
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{item.author_name ?? "A shopper"}</span>
          {item.rating != null ? (
            <>
              {" "}
              <span className="font-mono tabular-nums text-ticket">{item.rating}/5</span>
            </>
          ) : null}
          {place ? (
            <>
              {" "}
              at{" "}
              {placeHref ? (
                <Link href={placeHref} className="text-primary hover:underline">
                  {place}
                </Link>
              ) : (
                place
              )}
            </>
          ) : null}
        </p>
        <time className="shrink-0 text-sm text-muted-foreground" dateTime={item.created_at}>
          {timeAgo(item.created_at)}
        </time>
      </div>
      <p className="mt-1.5 text-base leading-snug">{item.body}</p>
      {item.tags.length ? (
        <ul className="mt-2 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="bg-foreground/90 px-1.5 py-0.5 text-sm text-receipt stall-chip-sm"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      {item.photos?.length ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {item.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-32 w-full rounded-sm object-cover" />
          ))}
        </div>
      ) : null}
      {item.verified_on_site ? (
        <p className="mt-2 inline-block border border-stamp px-1.5 py-0.5 text-sm text-stamp">
          On site
        </p>
      ) : null}
    </li>
  );
}
