"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductPhotoFrame({
  name,
  photo,
  decorative = false,
  className,
}: {
  name: string;
  photo: { url: string; alt: string } | null;
  /** The surrounding link or heading already names the food. */
  decorative?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(photo && !failed);

  return (
    <div className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary", className)}>
      {show && photo ? (
        <img
          src={photo.url}
          alt={decorative ? "" : photo.alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden className="type-column px-3 text-center">
          {name}
        </span>
      )}
    </div>
  );
}
