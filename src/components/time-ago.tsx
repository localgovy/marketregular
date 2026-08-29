"use client";

import { useEffect, useState } from "react";
import { formatPostedAt, timeAgo } from "@/lib/format";

export function TimeAgo({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatPostedAt(iso));

  useEffect(() => {
    function tick() {
      setLabel(timeAgo(iso));
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [iso]);

  return (
    <time className={className} dateTime={iso}>
      {label}
    </time>
  );
}
