import type { Metadata } from "next";
import { MarketsFloor } from "@/components/markets-floor";
import { loadMarketsFloorView } from "@/lib/markets-floor-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: `Markets page mockup · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function MarketsFloorPreviewPage() {
  const data = await loadMarketsFloorView();
  return <MarketsFloor data={data} preview />;
}
