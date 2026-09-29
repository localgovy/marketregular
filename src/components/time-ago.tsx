"use client";

import { formatPostedAt, timeAgo } from "@/lib/format";
import { useClientNow } from "@/lib/use-now";

export function TimeAgo({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const now = useClientNow();
  const label = now == null ? formatPostedAt(iso) : timeAgo(iso, now);

  return (
    <time className={className} dateTime={iso}>
      {label}
    </time>
  );
}
