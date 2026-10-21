import type { Metadata } from "next";
import { VendorPreviewWorkbench } from "@/app/preview/_components/vendor-preview-workbench";
import { loadVendorPreviewData } from "@/app/preview/_lib/vendor-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Vendor Page Redesign Concepts · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function VendorPreviewWorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; concept?: string }>;
}) {
  const params = await searchParams;
  const data = await loadVendorPreviewData(params.vendor);
  const initialConcept =
    params.concept === "2" ? "2" : params.concept === "3" ? "3" : "1";

  return (
    <VendorPreviewWorkbench
      data={data}
      initialConcept={initialConcept}
      basePath="/preview/vendors"
    />
  );
}
