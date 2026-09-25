"use client";

import { useState } from "react";
import { listingMarkSrc } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ListingMark({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const url = listingMarkSrc(src);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;

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
