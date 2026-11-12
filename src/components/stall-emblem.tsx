"use client";

import { useState } from "react";
import { CrateMark, RulesMark } from "@/components/marks";
import { listingMarkSrc } from "@/lib/format";
import { directPublicImageSrc, formatCensus } from "@/lib/stall-plate";
import { cn } from "@/lib/utils";

export { directPublicImageSrc, formatCensus };

const SIZE_SPEC = {
  xs: { box: "size-6 p-0.5", px: 24, icon: "size-3.5" },
  sm: { box: "size-8 p-1", px: 32, icon: "size-4" },
  md: { box: "size-11 p-1", px: 44, icon: "size-5" },
  lg: { box: "size-14 p-1.5", px: 56, icon: "size-6" },
} as const;

const TONE_CLASS = {
  paper: "bg-card text-board ring-1 ring-border",
  chalk: "bg-primary-foreground text-primary ring-1 ring-black/15",
  board: "bg-board text-chalk ring-1 ring-board",
} as const;

/** Listing plate: logo, or a market / stall stamp when the logo is missing. */
export function StallEmblem({
  src,
  name,
  kind = "vendor",
  size = "md",
  tone = "paper",
  className,
}: {
  src: string | null | undefined;
  name: string;
  kind?: "vendor" | "market";
  size?: keyof typeof SIZE_SPEC;
  tone?: keyof typeof TONE_CLASS;
  className?: string;
}) {
  const url = directPublicImageSrc(listingMarkSrc(src));
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(url && !failed);
  const sizeSpec = SIZE_SPEC[size];

  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "stall-chip-sm inline-flex shrink-0 items-center justify-center overflow-hidden select-none",
        sizeSpec.box,
        showLogo ? "bg-primary-foreground ring-1 ring-border" : TONE_CLASS[tone],
        className,
      )}
    >
      {showLogo && url ? (
        <img
          src={url}
          alt=""
          width={sizeSpec.px}
          height={sizeSpec.px}
          loading="lazy"
          decoding="async"
          className="block max-h-full max-w-full object-contain object-center"
          onError={() => setFailed(true)}
        />
      ) : kind === "market" ? (
        <RulesMark className={sizeSpec.icon} />
      ) : (
        <CrateMark className={sizeSpec.icon} />
      )}
    </span>
  );
}
