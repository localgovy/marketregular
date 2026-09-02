import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
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
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        {SITE_NAME} is the totally free all-in-one guide to shop local markets in {LAUNCH_CITY}.
        Find a market, discover their vendors, and either order for pickup or save to your
        profile so you can start planning your trip. We make it so that you can finally
        purchase fresh, local food without scouring the internet, all while supporting your
        fellow Canadians.
      </p>

      <section>
        <h2>Buy Canadian</h2>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Grocery aisles fill with whatever is cheapest to ship. When a border tightens or a
          price jumps, that supply wobbles, and the farm that used to sell here has already sold
          elsewhere. Buying Canadian keeps the next season in Canadian dirt, paid in Canadian
          wages. That is more important now than it has been in a long time: trade is a fight,
          grocery bills already are, and a country that cannot feed itself waits on someone
          else&apos;s truck.
        </p>
      </section>

      <section className="mt-10">
        <h2>Buy local</h2>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Canadian can still mean a warehouse two provinces over. Local means a stall you can
          walk to this week: Ontario tomatoes in season, Niagara fruit, GTA bakers, cheese from a
          name you can ask. The money stays with the grower and the neighbourhood instead of a
          head office. A farmers&apos; market is that meeting. You see the food, you meet the
          person, you decide.
        </p>
      </section>

      <section className="mt-10">
        <h2>Why this list</h2>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          Hours change. Stalls move. A good intention dies if you cannot tell which hall is open
          on Tuesday. {SITE_NAME} keeps the directory, the week, and who is on the floor in one
          place so the trip is about food, not guessing.
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
    </div>
  );
}
