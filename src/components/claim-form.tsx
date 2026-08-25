"use client";

import { useActionState } from "react";
import { CLAIM_ROLES } from "@/lib/claim";
import { submitClaim } from "@/app/actions/claims";
import { CLAIM_INBOX } from "@/lib/constants";
import { CaretDownMark } from "@/components/marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CLAIM_COPY = {
  vendor: {
    title: "Is this your stall?",
    lede: "Claim it to update hours, the menu, and how people find you.",
  },
  market: {
    title: "Do you run this market?",
    lede: "Claim it to update hours, vendors, and contact details.",
  },
} as const;

export function ClaimForm({
  targetType,
  targetId,
}: {
  targetType: "market" | "vendor";
  targetId: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null; message?: string } | null, formData: FormData) => {
      return submitClaim(formData);
    },
    null,
  );

  const copy = CLAIM_COPY[targetType];
  const roles = CLAIM_ROLES[targetType];
  const stall = targetType === "vendor";

  if (state?.message) {
    return (
      <div className="rounded-xl bg-secondary/50 p-5">
        <p className="font-medium">{copy.title}</p>
        <p className="mt-4 text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <details className="group rounded-xl bg-secondary/50 p-5">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 outline-none marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block font-medium">{copy.title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{copy.lede}</span>
        </span>
        <CaretDownMark className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        <p className="sr-only" aria-hidden="true">
          <label htmlFor="claim-gotcha">Company</label>
          <input id="claim-gotcha" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </p>

        <div className="grid gap-1.5">
          <Label htmlFor="claim-name">Your name</Label>
          <Input
            id="claim-name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="bg-card"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-email">Email</Label>
          <Input
            id="claim-email"
            name="email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            className="bg-card"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-phone">Phone</Label>
          <Input
            id="claim-phone"
            name="phone"
            type="tel"
            maxLength={40}
            autoComplete="tel"
            placeholder="Optional"
            className="bg-card"
          />
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Your role</legend>
          {roles.map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input type="radio" name="role" value={role} required className="accent-primary" />
              {role}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-business">{stall ? "Business or stall name" : "Organization"}</Label>
          <Input
            id="claim-business"
            name="business"
            maxLength={120}
            placeholder="Optional"
            className="bg-card"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-website">Website or Instagram</Label>
          <Input
            id="claim-website"
            name="website"
            maxLength={200}
            placeholder="Optional"
            autoComplete="url"
            className="bg-card"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="claim-notes">Anything else</Label>
          <Textarea
            id="claim-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            placeholder={
              stall
                ? "Stall number, hours to fix, or a manager we can email."
                : "Hours to fix, a manager we can email, or how this listing should read."
            }
            className="bg-card"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Sending…" : "Request to claim this listing"}
        </Button>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <p className="text-sm text-muted-foreground">
          Goes to {CLAIM_INBOX}. We reply to the email you give.
        </p>
      </form>
    </details>
  );
}
