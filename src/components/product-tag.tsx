import { tagLabel } from "@/lib/find-paths";
import { cn } from "@/lib/utils";

const PLATES: Record<string, string> = {
  produce: "bg-primary text-primary-foreground",
  organic: "bg-primary text-primary-foreground",
  flowers: "bg-primary text-primary-foreground",
  bakery: "bg-receipt text-foreground shadow-[inset_3px_0_0_var(--ticket)]",
  honey: "bg-receipt text-foreground shadow-[inset_3px_0_0_var(--ticket)]",
  preserves: "bg-receipt text-foreground shadow-[inset_3px_0_0_var(--ticket)]",
  cheese: "bg-receipt text-ticket ring-1 ring-ticket/50",
  meat: "bg-board text-chalk",
  seafood: "bg-board text-chalk",
  "prepared-food": "bg-board text-chalk",
  coffee: "bg-board text-chalk",
  crafts: "bg-foreground text-receipt",
};

export function ProductTag({ tag }: { tag: string }) {
  return (
    <li
      className={cn(
        "stall-chip-sm px-1.5 py-0.5 text-sm font-medium",
        PLATES[tag] ?? "bg-foreground text-receipt",
      )}
    >
      {tagLabel(tag)}
    </li>
  );
}
