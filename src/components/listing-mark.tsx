"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SVG_SRC = /\.svg(\?|$)/i;

export function ListingMark({
  src,
  className,
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed || SVG_SRC.test(src)) return null;

  return (
    <span className={cn("relative block h-12 w-[4.5rem] shrink-0", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="72px"
        className="object-contain object-right"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
