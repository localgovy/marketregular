"use client";

import { siteCopy } from "@/content/site-copy";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1>{siteCopy["/error"].h1}</h1>
      <p className="type-lede mt-3 text-muted-foreground">
        {siteCopy["/error"].lede}
      </p>
      <Button type="button" className="mt-6" onClick={() => reset()}>
        {siteCopy["/error"].tryAgain}
      </Button>
    </div>
  );
}
