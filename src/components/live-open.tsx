"use client";

import Link from "next/link";
import { Hours } from "@/components/hours";
import { NowLabel } from "@/components/now-label";
import { WEEKDAYS } from "@/lib/constants";
import { sessionIsOpen } from "@/lib/open-state";
import { formatHours, nextOpenLabel, nextOpenSlot, type ScheduleRow } from "@/lib/schedule";
import { rankVendorMarkets, vendorMarketWait } from "@/lib/vendor-markets";
import { useNow } from "@/lib/use-now";
import type { MarketSchedule } from "@/types/database";

export function LiveOpenState({
  schedules,
  province,
  nowMs,
}: {
  schedules: ScheduleRow[];
  province: string;
  nowMs: number;
}) {
  const now = useNow(nowMs);
  const when = schedules.length ? nextOpenLabel(schedules, province, new Date(now)) : null;
  if (!when) return null;
  if (when === "Open now") return <NowLabel>{when}</NowLabel>;
  return <span className="text-base font-medium text-primary">{when}</span>;
}

type Hall = {
  slug: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  province: string;
  days: number[];
  schedules: MarketSchedule[];
};

export function VendorNextLine({ halls, nowMs }: { halls: Hall[]; nowMs: number }) {
  const now = useNow(nowMs);
  const clock = new Date(now);
  const nextMarket = rankVendorMarkets(halls, clock).find((hall) =>
    Number.isFinite(vendorMarketWait(hall, clock)),
  );
  if (!nextMarket) return null;
  const nextRows = nextMarket.schedules.filter((row) => nextMarket.days.includes(Number(row.weekday)));
  if (!nextRows.length) return null;
  const nextSlot = nextOpenSlot(nextRows, nextMarket.province, clock);
  if (!nextSlot) return null;
  const nextRow = nextRows.find((row) => Number(row.weekday) === nextSlot.weekday);
  const nextHours = nextRow ? formatHours(nextRow.opens_at, nextRow.closes_at) : "";

  return (
    <p className="type-lede mt-2 max-w-3xl text-pretty text-muted-foreground">
      {nextSlot.waitMinutes === 0 ? (
        <>
          <NowLabel>Open now</NowLabel>
          {" at "}
        </>
      ) : (
        <>{WEEKDAYS[nextSlot.weekday]} at </>
      )}
      <Link href={`/markets/${nextMarket.slug}`} className="font-medium text-foreground hover:underline">
        {nextMarket.name}
      </Link>
      {nextHours ? (
        <>
          {", "}
          <Hours value={nextHours} className="text-muted-foreground" />
        </>
      ) : null}
    </p>
  );
}

export function DayOpenMark({
  rows,
  nowMs,
  count,
  isToday,
}: {
  rows: Array<{ date: string; opensMinutes: number; closesMinutes: number }>;
  nowMs: number;
  count: number;
  isToday: boolean;
}) {
  const now = useNow(nowMs);
  const open = rows.some((row) => sessionIsOpen(row, new Date(now)));
  if (open) return <NowLabel>Open now</NowLabel>;
  return (
    <p className="text-sm text-muted-foreground">
      <span className="type-nums text-foreground">{count}</span>{" "}
      {count === 1 ? "market" : "markets"}
      {isToday ? " · today" : ""}
    </p>
  );
}
