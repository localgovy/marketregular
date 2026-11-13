import { PortalHome } from "@/components/portal-home";
import { copyText, siteCopy } from "@/content/site-copy";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/vendor"].title,
  path: "/vendor",
  description: copyText(siteCopy["/vendor"].description),
  index: false,
});

export default function VendorPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; request?: string }>;
}) {
  return <PortalHome kind="vendor" searchParams={searchParams} />;
}
