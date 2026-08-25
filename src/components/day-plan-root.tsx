import { DayPlanHint } from "@/components/day-plan-hint";
import { DayPlanProvider } from "@/components/day-plan-provider";
import { DayPlanSlip } from "@/components/day-plan-slip";
import { HomeGeo } from "@/components/home-geo";
import { listMarkets } from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";

export async function DayPlanRoot({ children }: { children: React.ReactNode }) {
  const markets = await listMarkets();
  return (
    <HomeGeo markets={markets.map(toGeoMarket)}>
      <DayPlanProvider>
        {children}
        <DayPlanSlip />
        <DayPlanHint />
      </DayPlanProvider>
    </HomeGeo>
  );
}
