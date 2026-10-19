import type { Metadata } from "next";
import { ConceptNeighbourhoodAtlas } from "@/app/preview/_components/concept-neighbourhood-atlas";
import { loadHomePreviewData } from "@/app/preview/_lib/home-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Concept 3: The Craving & Neighbourhood Atlas · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function PreviewHomeConcept3Page() {
  const data = await loadHomePreviewData();
  return <ConceptNeighbourhoodAtlas data={data} standalone />;
}
