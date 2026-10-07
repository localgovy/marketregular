"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CaretDownMark, CaretUpMark } from "@/components/marks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MenuSectionRef } from "@/lib/menu-sections";
import type { PortalResult } from "@/lib/vendor-portal";

function Note({ state }: { state: PortalResult | undefined }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.message) return <p className="text-sm text-primary">{state.message}</p>;
  return null;
}

export function MenuSectionsBoard({
  vendorId,
  sections,
  rename,
  move,
}: {
  vendorId: string;
  sections: MenuSectionRef[];
  rename: (formData: FormData) => Promise<PortalResult>;
  move: (formData: FormData) => Promise<PortalResult>;
}) {
  const router = useRouter();
  const [renameState, renameAction, renamePending] = useActionState(
    (_prev: PortalResult | undefined, formData: FormData) => rename(formData),
    undefined,
  );
  const [moveState, moveAction, movePending] = useActionState(
    (_prev: PortalResult | undefined, formData: FormData) => move(formData),
    undefined,
  );

  useEffect(() => {
    if (renameState?.message || moveState?.message) router.refresh();
  }, [renameState, moveState, router]);

  if (!sections.length) return null;

  return (
    <div className="mt-4 grid gap-3">
      <h3>Sections</h3>
      <p className="text-sm text-muted-foreground">
        Up to 5 named groups on the stall page. Rename or reorder them here.
      </p>
      <ul className="grid gap-3">
        {sections.map((section, index) => (
          <li
            key={section.name}
            className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          >
            <form action={renameAction} className="grid gap-1.5 min-w-0">
              <input type="hidden" name="vendor_id" value={vendorId} />
              <input type="hidden" name="from" value={section.name} />
              <Label htmlFor={`${vendorId}-section-${index}`}>Name</Label>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  id={`${vendorId}-section-${index}`}
                  name="name"
                  required
                  maxLength={40}
                  defaultValue={section.name}
                  className="min-w-0 flex-1"
                />
                <Button type="submit" disabled={renamePending}>
                  {renamePending ? "Saving…" : "Rename"}
                </Button>
              </div>
            </form>
            <div className="flex items-center gap-1">
              <form action={moveAction}>
                <input type="hidden" name="vendor_id" value={vendorId} />
                <input type="hidden" name="section" value={section.name} />
                <input type="hidden" name="direction" value="up" />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move up"
                  disabled={movePending || index === 0}
                >
                  <CaretUpMark className="size-4" />
                </Button>
              </form>
              <form action={moveAction}>
                <input type="hidden" name="vendor_id" value={vendorId} />
                <input type="hidden" name="section" value={section.name} />
                <input type="hidden" name="direction" value="down" />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Move down"
                  disabled={movePending || index === sections.length - 1}
                >
                  <CaretDownMark className="size-4" />
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <Note state={renameState} />
      <Note state={moveState} />
    </div>
  );
}
