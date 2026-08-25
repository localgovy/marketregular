import { tagLabel } from "@/lib/find-paths";

export function ProductTag({ tag }: { tag: string }) {
  return (
    <li className="stall-chip-sm bg-foreground px-2 py-0.5 text-sm text-receipt">
      {tagLabel(tag)}
    </li>
  );
}
