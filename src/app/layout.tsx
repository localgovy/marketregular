import type { Metadata } from "next";
import { Suspense } from "react";
import { Barlow_Condensed, Mona_Sans, Schibsted_Grotesk } from "next/font/google";
import Script from "next/script";
import { AppToaster } from "@/components/app-toaster";
import { SiteGeo } from "@/components/site-geo";
import { GuestSignInSlip } from "@/components/guest-signin-slip";
import { NavHistory } from "@/components/nav-history";
import { SiteAnalytics } from "@/components/site-analytics";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { OAUTH_HASH_SCRUB_SCRIPT } from "@/lib/analytics";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, SITE_OG } from "@/lib/constants";
import { SITE_DESCRIPTION, websiteJsonLd } from "@/lib/seo";
import "./globals.css";

const grotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const display = Mona_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: false,
});

const nums = Barlow_Condensed({
  weight: "800",
  subsets: ["latin"],
  variable: "--font-nums",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: SITE_NAME,
    images: [
      {
        url: SITE_OG,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-CA"
      className={`${grotesk.variable} ${display.variable} ${nums.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteGeo>
          <JsonLd data={websiteJsonLd()} />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Suspense fallback={null}>
            <NavHistory />
            <GuestSignInSlip />
          </Suspense>
          <AppToaster />
        </SiteGeo>
        <Script id="oauth-hash-scrub" strategy="beforeInteractive">
          {OAUTH_HASH_SCRUB_SCRIPT}
        </Script>
        <SiteAnalytics />
      </body>
    </html>
  );
}
