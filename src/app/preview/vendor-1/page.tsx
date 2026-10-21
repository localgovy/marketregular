import type { Metadata } from "next";
import { VendorPreviewWorkbench } from "@/app/preview/_components/vendor-preview-workbench";
import { loadVendorPreviewData } from "@/app/preview/_lib/vendor-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Vendor Concept 1: Market Counter & Order Slip · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function VendorConceptOnePage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const params = await searchParams;
  const data = await loadVendorPreviewData(params.vendor);

  return (
    <VendorPreviewWorkbench
      data={data}
      initialConcept="1"
      basePath="/preview/vendor-1"
    />
  );
}
