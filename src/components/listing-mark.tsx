"use client";

import { useState } from "react";
import { listingMarkOriginal, listingMarkSrc } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ListingMark({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const original = listingMarkOriginal(src);
  const compact = listingMarkSrc(src);
  const [useOriginal, setUseOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = useOriginal ? original : compact;
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
        onError={() => {
          if (!useOriginal && original && original !== url) {
            setUseOriginal(true);
            return;
          }
          setFailed(true);
        }}
      />
    </span>
  );
}
