import { GeoProvider } from "@/components/geo-provider";

export function SiteGeo({ children }: { children: React.ReactNode }) {
  return <GeoProvider>{children}</GeoProvider>;
}
