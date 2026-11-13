import type { Metadata } from "next";
import Link from "next/link";
import { MapleMark } from "@/components/marks";
import { copyText, siteCopy } from "@/content/site-copy";
import { CONTACT_EMAIL, CONTACT_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/about"].title,
  path: "/about",
  description: copyText(siteCopy["/about"].description),
});

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{siteCopy["/about"].h1}</h1>
      <p className="type-lede mt-2 mb-8">
        {copyText(siteCopy["/about"].lede)}
      </p>

      <section>
        <h2 className="flex items-center gap-2.5">
          <MapleMark className="h-7 w-14 shrink-0 text-stamp shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" />
          {siteCopy["/about"].buyCanadian}
        </h2>
        <p className="mt-2 text-base leading-relaxed">
          Grocery stores fill with whatever is cheapest to ship. Buying Canadian keeps the next
          season in Canadian dirt, paid in Canadian wages. That is more important now than it has
          been in a long time: trade is a fight, grocery bills already are, and Canadians deserve
          a simple way to purchase goods grown on our own soil.
        </p>
      </section>

      <section className="mt-10">
        <h2>{copyText(siteCopy["/about"].why)}</h2>
        <p className="mt-2 text-base leading-relaxed">
          The directory lists the markets, the stalls, and the hours, so you can see what is
          selling and go. That keeps the money with the farms and businesses at the market.
        </p>
        <p className="mt-4 text-base">
          <Link href="/markets" className="font-medium hover:underline">
            {siteCopy["/about"].findAMarket}
          </Link>
          {" · "}
          <Link href="/events" className="font-medium hover:underline">
            {siteCopy["/about"].thisMonthsDays}
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2>{siteCopy["/about"].team}</h2>
        <p className="mt-2 text-base font-medium">{CONTACT_NAME}</p>
        <p className="mt-1 text-base">{copyText(siteCopy["/about"].founder)}</p>
        <p className="mt-3 text-base">
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
