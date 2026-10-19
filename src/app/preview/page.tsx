import type { Metadata } from "next";
import { PreviewWorkbench } from "@/app/preview/_components/preview-workbench";
import { loadHomePreviewData } from "@/app/preview/_lib/home-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Homepage Concept Comparison · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function PreviewComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  const [params, data] = await Promise.all([searchParams, loadHomePreviewData()]);
  const initialConcept =
    params.design === "2" ? "2" : params.design === "3" ? "3" : "1";

  return <PreviewWorkbench data={data} initialConcept={initialConcept} />;
}
