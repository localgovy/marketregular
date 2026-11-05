import type { Metadata } from "next";
import { MarketsFloor } from "@/components/markets-floor";
import { loadMarketsFloorData } from "@/app/preview/_lib/markets-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: `Markets page mockup · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function MarketsFloorPreviewPage() {
  const data = await loadMarketsFloorData();
  return <MarketsFloor data={data} preview />;
}
