import type { Metadata } from "next";
import { ConceptDispatchBoard } from "@/app/preview/_components/concept-dispatch-board";
import { loadHomePreviewData } from "@/app/preview/_lib/home-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Concept 2: The Grand Hall Departure Board · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function PreviewHomeConcept2Page() {
  const data = await loadHomePreviewData();
  return <ConceptDispatchBoard data={data} standalone />;
}
