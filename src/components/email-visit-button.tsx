"use client";

import { useState, useTransition } from "react";
import { emailVisitPlan } from "@/app/actions/visit-plan";
import { Button } from "@/components/ui/button";

export function EmailVisitButton({
  slugs,
  className,
}: {
  slugs: string[];
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setMessage(null);
    setError(null);
    start(async () => {
      const result = await emailVisitPlan(slugs);
      if (result.error) setError(result.error);
      else setMessage(result.message ?? "Sent.");
    });
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" disabled={pending || slugs.length === 0} onClick={send}>
        {pending ? "Sending…" : "Email this week to me"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
