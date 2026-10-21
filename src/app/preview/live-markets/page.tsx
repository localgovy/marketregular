import type { Metadata } from "next";
import { LiveMarketsWorkbench } from "@/app/preview/_components/live-markets-workbench";
import {
  loadLiveMarketsPreviewData,
  type ClockScenarioId,
} from "@/app/preview/_lib/live-markets-preview-data";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Live Markets Homepage Mockups · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default async function LiveMarketsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ option?: string; clock?: string }>;
}) {
  const [params, previewData] = await Promise.all([
    searchParams,
    loadLiveMarketsPreviewData(),
  ]);

  const initialVariant =
    params.option === "B" || params.option === "b"
      ? "B"
      : params.option === "C" || params.option === "c"
        ? "C"
        : "A";

  const initialScenario: ClockScenarioId | undefined =
    params.clock === "saturday"
      ? "saturday-peak"
      : params.clock === "tuesday"
        ? "tuesday-afternoon"
        : params.clock === "after-hours"
          ? "live-now"
          : undefined;

  return (
    <LiveMarketsWorkbench
      previewData={previewData}
      initialVariant={initialVariant}
      initialScenario={initialScenario}
    />
  );
}
