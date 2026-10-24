import type { Metadata } from "next";
import { MarketsPreviewWorkbench } from "@/app/preview/_components/markets-preview-workbench";
import { loadMarketsPreviewData } from "@/app/preview/_lib/markets-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Markets Concept 2: The Hours Board · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function MarketsConceptTwoPage() {
  const data = await loadMarketsPreviewData();
  return <MarketsPreviewWorkbench data={data} initialConcept="2" basePath="/preview/market-2" />;
}
