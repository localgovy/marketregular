import { sectionsFor, type MaintenanceKind } from "@/lib/maintenance-sections";

export function MaintenanceOptOutFields({
  kind,
  selected,
  noun,
}: {
  kind: MaintenanceKind;
  selected: readonly string[];
  noun: "stall" | "market";
}) {
  return (
    <fieldset className="grid gap-2 sm:col-span-2">
      <legend className="text-base font-medium">Updates</legend>
      <p className="text-base text-muted-foreground">
        Checked sections stay with the {noun}. Leave the last box off to keep them as they are.
      </p>
      <input type="hidden" name="maintenance_opt_outs_form" value="1" />
      <input type="hidden" name="maintenance_opt_outs_loaded" value={selected.join(",")} />
      {sectionsFor(kind).map((section) => (
        <label key={section.key} className="flex items-baseline gap-2 text-base">
          <input
            type="checkbox"
            name="maintenance_opt_outs"
            value={section.key}
            defaultChecked={selected.includes(section.key)}
          />
          <span>{section.label}</span>
        </label>
      ))}
      <label className="mt-2 flex items-baseline gap-2 text-base">
        <input type="checkbox" name="maintenance_override" />
        <span>Save these sections anyway</span>
      </label>
    </fieldset>
  );
}

export function MaintenanceOverride({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <label className={`flex items-baseline gap-2 text-base ${className ?? ""}`}>
      <input type="checkbox" name="maintenance_override" />
      <span>Save these sections anyway</span>
    </label>
  );
}
