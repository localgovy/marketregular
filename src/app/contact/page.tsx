import type { Metadata } from "next";
import Link from "next/link";
import { copyText, siteCopy } from "@/content/site-copy";
import { CONTACT_EMAIL, CONTACT_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/contact"].title,
  path: "/contact",
  description: copyText(siteCopy["/contact"].description),
});

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{siteCopy["/contact"].h1}</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        {siteCopy["/contact"].lede}
      </p>

      <section>
        <h2>{siteCopy["/contact"].runAListing}</h2>
        <p className="mt-2 mb-4 text-base text-muted-foreground">
          {siteCopy["/contact"].runAListingCaption}
        </p>
        <ul className="grid gap-2 text-base">
          <li>
            <Link href="/market" className="font-medium hover:underline">
              {siteCopy["/contact"].marketAccount}
            </Link>
          </li>
          <li>
            <Link href="/vendor" className="font-medium hover:underline">
              {siteCopy["/contact"].vendorAccount}
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2>{siteCopy["/contact"].writeUs}</h2>
        <p className="mt-2 text-base font-medium">{CONTACT_NAME}</p>
        <p className="mt-1 text-base text-muted-foreground">{copyText(siteCopy["/contact"].founder)}</p>
        <p className="mt-3 text-base">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
