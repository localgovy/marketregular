"use client";

import { useActionState } from "react";
import { saveOwnedMaintenanceOptOuts } from "@/app/actions/maintenance-opt-outs";
import { Button } from "@/components/ui/button";
import { sectionsFor, type MaintenanceKind } from "@/lib/maintenance-sections";
import type { PortalResult } from "@/lib/vendor-portal";

function note(state: PortalResult | undefined) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.message) return <p className="text-sm text-primary">{state.message}</p>;
  return null;
}

export function MaintenanceOptOutForm({
  kind,
  listingId,
  selected,
}: {
  kind: MaintenanceKind;
  listingId: string;
  selected: readonly string[];
}) {
  const [state, action, pending] = useActionState(
    (_prev: PortalResult | undefined, formData: FormData) => saveOwnedMaintenanceOptOuts(formData),
    undefined,
  );
  return (
    <section>
      <h2>Updates</h2>
      <p className="mt-2 text-base text-muted-foreground">
        We keep this page current from public sources. Check a section to keep it yourself. We will leave that
        part alone.
      </p>
      <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="listing_id" value={listingId} />
        {sectionsFor(kind).map((section) => (
          <label key={section.key} className="flex items-baseline gap-2 text-base">
            <input
              type="checkbox"
              name="maintenance_opt_outs"
              value={section.key}
              defaultChecked={selected.includes(section.key)}
              className="accent-primary"
            />
            <span>{section.label}</span>
          </label>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save updates"}
          </Button>
          {note(state)}
        </div>
      </form>
    </section>
  );
}

