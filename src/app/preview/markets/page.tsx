import type { Metadata } from "next";
import { MarketsPreviewWorkbench } from "@/app/preview/_components/markets-preview-workbench";
import { loadMarketsPreviewData } from "@/app/preview/_lib/markets-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Markets Page Redesign Concepts · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function MarketsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ concept?: string }>;
}) {
  const [params, data] = await Promise.all([searchParams, loadMarketsPreviewData()]);
  const initialConcept =
    params.concept === "2" ? "2" : params.concept === "3" ? "3" : "1";

  return (
    <MarketsPreviewWorkbench
      key={initialConcept}
      data={data}
      initialConcept={initialConcept}
    />
  );
}
