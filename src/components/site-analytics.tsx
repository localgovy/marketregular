"use client";

import Script from "next/script";
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
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">{`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${GA_MEASUREMENT_ID}');
`}</Script>
    </>
  );
}
