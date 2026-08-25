"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { emailVisitPlan } from "@/app/actions/visit-plan";
import { Button } from "@/components/ui/button";
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
  const [now, setNow] = useState<number | null>(null);
  const busy = useRef(false);
  const waitMs = visitPlanWaitMs(sentAt, now ?? 0);
  const cooling = waitMs > 0;

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

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
