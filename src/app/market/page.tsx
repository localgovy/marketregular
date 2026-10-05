import { PortalHome } from "@/components/portal-home";
import { SITE_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Market Portal",
  path: "/market",
  description: `Create an account to update the ${SITE_NAME} market you run.`,
  index: false,
});

export default function MarketPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; request?: string }>;
}) {
  return <PortalHome kind="market" searchParams={searchParams} />;
}
