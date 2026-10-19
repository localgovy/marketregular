import type { Metadata } from "next";
import { ConceptBroadsheet } from "@/app/preview/_components/concept-broadsheet";
import { loadHomePreviewData } from "@/app/preview/_lib/home-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Concept 1: The Saturday Broadsheet · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function PreviewHome1Page() {
  const data = await loadHomePreviewData();
  return <ConceptBroadsheet data={data} standalone />;
}
