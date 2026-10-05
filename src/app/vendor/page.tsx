import { PortalHome } from "@/components/portal-home";
import { SITE_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Vendor Portal",
  path: "/vendor",
  description: `Create an account to update the ${SITE_NAME} stall you run.`,
  index: false,
});

export default function VendorPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; request?: string }>;
}) {
  return <PortalHome kind="vendor" searchParams={searchParams} />;
}
