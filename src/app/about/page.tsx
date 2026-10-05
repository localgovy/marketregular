import type { Metadata } from "next";
import Link from "next/link";
import { MapleMark } from "@/components/marks";
import { CONTACT_EMAIL, CONTACT_NAME, SITE_NAME, STUDIO_URL } from "@/lib/constants";
import { LAUNCH_CITY, LAUNCH_COVERAGE } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  path: "/about",
  description: `Why ${SITE_NAME} exists: so people in ${LAUNCH_COVERAGE} can buy Canadian food from the vendor that grew it.`,
});

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>About</h1>
      <p className="type-lede mt-2 mb-8">
        {SITE_NAME} is the totally free all-in-one guide to shop local markets in {LAUNCH_CITY}.
        Find a market, see who is selling, and save the ones you actually go to.
      </p>

      <section>
        <h2 className="flex items-center gap-2.5">
          <MapleMark className="h-7 w-14 shrink-0 text-stamp shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" />
          Buy Canadian
        </h2>
        <p className="mt-2 text-base leading-relaxed">
          Grocery aisles fill with whatever is cheapest to ship. Buying Canadian keeps the next
          season in Canadian dirt, paid in Canadian wages. That is more important now than it has
          been in a long time: trade is a fight, grocery bills already are, and Canadians deserve
          a simple way to purchase goods grown on our own soil.
        </p>
      </section>

      <section className="mt-10">
        <h2>Why {SITE_NAME}?</h2>
        <p className="mt-2 text-base leading-relaxed">
          The directory lists the markets, the stalls, and the hours, so you can see what is
          selling and go. That keeps the money with the farms and businesses at the market.
        </p>
        <p className="mt-4 text-base">
          <Link href="/markets" className="font-medium hover:underline">
            Find a market
          </Link>
          {" · "}
          <Link href="/events" className="font-medium hover:underline">
            This month&apos;s days
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2>The Team</h2>
        <p className="mt-2 text-base font-medium">{CONTACT_NAME}</p>
        <p className="mt-1 text-base">
          Founder, CEO of{" "}
          <a href={STUDIO_URL} rel="noreferrer" className="hover:underline">LocalGovy</a>, the team behind {SITE_NAME}
        </p>
        <p className="mt-3 text-base">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
