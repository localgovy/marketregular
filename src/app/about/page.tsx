import type { Metadata } from "next";
import Link from "next/link";
import { MapleMark } from "@/components/marks";
import { CONTACT_EMAIL, CONTACT_NAME, SITE_NAME, STUDIO_URL } from "@/lib/constants";
import { LAUNCH_CITY, LAUNCH_COVERAGE } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "About",
  path: "/about",
  description: `Why ${SITE_NAME} exists: so people in ${LAUNCH_COVERAGE} can buy Canadian food from the stall that grew it.`,
});

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>About</h1>
      <p className="type-lede mt-2 mb-8">
        {SITE_NAME} is the totally free all-in-one guide to shop local markets in {LAUNCH_CITY}.
        Find a market, discover their vendors, and either order for pickup or save to your
        profile so you can start planning your trip. We make it so that you can finally
        purchase fresh, local food without scouring the internet, all while supporting your
        fellow Canadians.
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
          There&apos;s no better time to shop local, we know that. With a massive database of all
          markets in {LAUNCH_CITY}, we offer discovery and information no one else can. We are
          also partnering up with dozens of markets all over {LAUNCH_CITY} to bring Torontonians
          pickup, offering the most convenient way to shop fresh and local while putting cash back
          in the pockets of local farms and businesses.
        </p>
        <p className="mt-4 text-base">
          <Link href="/markets" className="font-medium hover:underline">
            Find a market
          </Link>
          {" · "}
          <Link href="/events" className="font-medium hover:underline">
            This month&apos;s days
          </Link>
          {" · "}
          <Link href="/contact" className="font-medium hover:underline">
            Write us
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
