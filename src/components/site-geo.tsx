import { HomeGeo } from "@/components/home-geo";
import { listMarkets } from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";

export async function SiteGeo({ children }: { children: React.ReactNode }) {
  const markets = await listMarkets();
  return <HomeGeo markets={markets.map(toGeoMarket)}>{children}</HomeGeo>;
}
