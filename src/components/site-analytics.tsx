"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID } from "@/lib/constants";
import { isAuthAnalyticsPath, sanitizeAnalyticsUrl } from "@/lib/analytics";

function beforeSend(event: BeforeSendEvent) {
  const url = sanitizeAnalyticsUrl(event.url);
  if (url == null) return null;
  return { ...event, url };
}

export function SiteAnalytics() {
  const pathname = usePathname() ?? "";
  if (isAuthAnalyticsPath(pathname)) return null;
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
    </>
  );
}
