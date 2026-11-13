import { PortalHome } from "@/components/portal-home";
import { copyText, siteCopy } from "@/content/site-copy";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/market"].title,
  path: "/market",
  description: copyText(siteCopy["/market"].description),
  index: false,
});

export default function MarketPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; request?: string }>;
}) {
  return <PortalHome kind="market" searchParams={searchParams} />;
}
