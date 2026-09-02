import { HoursRow } from "@/components/hours-row";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { marketListName } from "@/lib/listing-copy";
import type { WeekListSlot } from "@/lib/upcoming";

export function WeekSlotRow({ slot }: { slot: WeekListSlot }) {
  return (
    <HoursRow
      href={`/markets/${slot.market.slug}`}
      name={marketListName(slot.market.name, slot.market.city)}
      hours={slot.hours}
      extra={slot.open ? <NowLabel>Open</NowLabel> : null}
      hoursClassName={slot.open ? "text-stamp" : "text-muted-foreground"}
      className="px-3 py-1.5 hover:bg-primary/[0.045]"
      save={<SaveButton kind="market" slug={slot.market.slug} name={slot.market.name} />}
    />
  );
}
