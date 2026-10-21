"use client";

import { useState } from "react";
import { menuItemPhotoUrl } from "@/lib/menu-item-photo-url";

/** Square thumb for a menu row. The name beside it is the label, so the picture is decorative. */
export function MenuItemPhoto({
  url,
  menuId,
}: {
  url: string | null | undefined;
  menuId?: string | null;
}) {
  const src = menuItemPhotoUrl(url, menuId);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) return null;

  return (
    <span className="block size-[4.5rem] shrink-0 overflow-hidden bg-secondary">
      <img
        src={src}
        alt=""
        width={72}
        height={72}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
        onError={() => setFailedSrc(src)}
      />
    </span>
  );
}
