import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_NAME, SITE_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  path: "/contact",
  description: `Write ${SITE_NAME}, or open a market or vendor account.`,
});

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Contact</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Open a market or vendor account, or write to us.
      </p>

      <section>
        <h2>Run a listing</h2>
        <p className="mt-2 mb-4 text-base text-muted-foreground">
          Create the account in the portal. After we assign the listing, you can edit it there.
        </p>
        <ul className="grid gap-2 text-base">
          <li>
            <Link href="/market" className="font-medium hover:underline">
              Market account
            </Link>
          </li>
          <li>
            <Link href="/vendor" className="font-medium hover:underline">
              Vendor account
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2>Write us</h2>
        <p className="mt-2 text-base font-medium">{CONTACT_NAME}</p>
        <p className="mt-1 text-base text-muted-foreground">Founder of {SITE_NAME}</p>
        <p className="mt-3 text-base">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
