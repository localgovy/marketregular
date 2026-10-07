"use client";

import { useState } from "react";
import { listingMarkSrc } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ListingMark({
  src,
  className,
  plate = false,
}: {
  src: string | null | undefined;
  className?: string;
  /** Product row: hug the file. Paper fill is for the green header; override it on a paper row. */
  plate?: boolean;
}) {
  const url = listingMarkSrc(src);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  if (!url || failed) return null;

  if (plate) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-primary-foreground p-0.5",
          ready ? null : "size-9",
          className,
        )}
      >
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="block h-auto max-h-8 w-auto max-w-16 object-contain object-center"
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setReady(true);
          }}
          onLoad={(event) => {
            if (event.currentTarget.naturalWidth > 0) setReady(true);
          }}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={cn("relative block h-12 w-[4.5rem] shrink-0", className)}>
      <img
        src={url}
        alt=""
        width={72}
        height={48}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain object-right"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
