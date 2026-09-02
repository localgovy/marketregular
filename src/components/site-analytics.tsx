"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import type { AnalyticsProps, BeforeSendEvent } from "@vercel/analytics/next";
import { GA_MEASUREMENT_ID } from "@/lib/constants";
import { isAuthAnalyticsPath, sanitizeAnalyticsUrl } from "@/lib/analytics";

const FALLBACK_MS = 4000;

function beforeSend(event: BeforeSendEvent) {
  const url = sanitizeAnalyticsUrl(event.url);
  if (url == null) return null;
  return { ...event, url };
}

export function SiteAnalytics() {
  const pathname = usePathname() ?? "";
  const started = useRef(false);
  const [ready, setReady] = useState(false);
  const [Analytics, setAnalytics] = useState<ComponentType<AnalyticsProps> | null>(
    null,
  );

  useEffect(() => {
    if (isAuthAnalyticsPath(pathname) || started.current) return;

    const start = () => {
      if (started.current) return;
      started.current = true;
      setReady(true);
    };

    const onInput = () => start();
    window.addEventListener("pointerdown", onInput, { once: true, passive: true });
    window.addEventListener("keydown", onInput, { once: true });

    const timeoutId = window.setTimeout(start, FALLBACK_MS);
    const idleId =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(start, { timeout: FALLBACK_MS })
        : 0;

    return () => {
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("keydown", onInput);
      window.clearTimeout(timeoutId);
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void import("@vercel/analytics/next").then((mod) => {
      if (!cancelled) setAnalytics(() => mod.Analytics);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (isAuthAnalyticsPath(pathname) || !ready) return null;

  return (
    <>
      {Analytics ? <Analytics beforeSend={beforeSend} /> : null}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">{`
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${GA_MEASUREMENT_ID}');
`}</Script>
    </>
  );
}
