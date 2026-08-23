import { tagLabel } from "@/lib/find-paths";

export function ProductTag({ tag }: { tag: string }) {
  return (
    <li className="stall-chip-sm bg-receipt px-1.5 py-0.5 text-sm font-medium text-foreground shadow-[inset_3px_0_0_var(--ticket)]">
      {tagLabel(tag)}
    </li>
  );
}
