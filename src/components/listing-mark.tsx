"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { externalHref } from "@/lib/format";

const SVG_SRC = /\.svg(\?|$)/i;

export function ListingMark({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = externalHref(src);
  if (!url || failed || SVG_SRC.test(url)) return null;

  return (
    <span className={cn("relative block h-12 w-[4.5rem] shrink-0", className)}>
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain object-right"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
