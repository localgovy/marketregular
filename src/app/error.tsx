"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1>Something stuck</h1>
      <p className="type-lede mt-3 text-muted-foreground">
        Try that page again. The directory is still here.
      </p>
      <Button type="button" className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
