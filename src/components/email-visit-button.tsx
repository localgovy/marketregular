"use client";

import { useRef, useState, useTransition } from "react";
import { emailVisitPlan } from "@/app/actions/visit-plan";
import { Button } from "@/components/ui/button";
import { useClientNow } from "@/lib/use-now";
import { visitPlanWaitCopy, visitPlanWaitMs } from "@/lib/visit-plan-limit";

export function EmailVisitButton({
  slugs,
  className,
  lastSentAt = null,
}: {
  slugs: string[];
  className?: string;
  lastSentAt?: string | null;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(lastSentAt);
  const now = useClientNow();
  const busy = useRef(false);
  const waitMs = now == null ? 0 : visitPlanWaitMs(sentAt, now);
  const cooling = now != null && waitMs > 0;

  function send() {
    if (busy.current || cooling || slugs.length === 0) return;
    busy.current = true;
    setMessage(null);
    setError(null);
    start(async () => {
      try {
        const result = await emailVisitPlan(slugs);
        if (result.wait) {
          setSentAt(new Date().toISOString());
          setMessage(result.message ?? visitPlanWaitCopy(visitPlanWaitMs(new Date().toISOString())));
          return;
        }
        if (result.error) {
          setError(result.error);
          return;
        }
        setSentAt(new Date().toISOString());
        setMessage(result.message ?? "Sent.");
      } finally {
        busy.current = false;
      }
    });
  }

  const note = error ? null : message ?? (now != null && cooling ? visitPlanWaitCopy(waitMs) : null);

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        disabled={pending || cooling || slugs.length === 0}
        onClick={send}
      >
        {pending ? "Sending…" : "Email this week to me"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {note ? <p className="mt-2 text-sm text-muted-foreground">{note}</p> : null}
    </div>
  );
}
