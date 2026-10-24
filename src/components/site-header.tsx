import { Suspense } from "react";
import { DayStrip, LiveDayStrip, SiteHeaderFrame } from "@/components/site-header-frame";
import { getHeaderBoard } from "@/lib/header-board-load";

async function HeaderBoardSlot() {
  const board = await getHeaderBoard();
  return <LiveDayStrip initial={board} />;
}

export function SiteHeader() {
  return (
    <SiteHeaderFrame
      strip={
        <Suspense fallback={<DayStrip board={null} />}>
          <HeaderBoardSlot />
        </Suspense>
      }
    />
  );
}
