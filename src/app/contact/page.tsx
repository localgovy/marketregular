import type { Metadata } from "next";
import { ContactClaim } from "@/components/contact-claim";
import {
  CONTACT_EMAIL,
  CONTACT_NAME,
  SITE_NAME,
  STUDIO_URL,
} from "@/lib/constants";
import { listMarkets, listStalls, listVendors } from "@/lib/data/catalog";
import { pageMeta } from "@/lib/seo";
import type { Market, StallRef, Vendor } from "@/types/database";

export const metadata: Metadata = pageMeta({
  title: "Contact",
  path: "/contact",
  description: `Write ${SITE_NAME}, or claim a Toronto market or stall you run.`,
});

export const revalidate = 3600;

function contactListings(markets: Market[], vendors: Vendor[], stalls: StallRef[]) {
  const marketName = new Map(markets.map((market) => [market.id, market.name]));
  const where = new Map<string, string[]>();
  for (const stall of stalls) {
    const name = marketName.get(stall.market_id);
    if (!name) continue;
    const list = where.get(stall.id);
    if (list) {
      if (!list.includes(name)) list.push(name);
    } else {
      where.set(stall.id, [name]);
    }
  }
  return {
    markets: markets.map((market) => ({ id: market.id, name: market.name })),
    vendors: vendors.map((vendor) => {
      const at = where.get(vendor.id);
      return {
        id: vendor.id,
        name: vendor.name,
        ...(at?.length ? { where: at.join(", ") } : {}),
      };
    }),
  };
}

export default async function ContactPage() {
  const [markets, vendors, stalls] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
  ]);
  const listings = contactListings(markets, vendors, stalls);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Contact</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Claim a market or vendor, or write to us.
      </p>

      <section>
        <h2>Claim a listing</h2>
        <p className="mt-2 mb-6 text-base text-muted-foreground">
          If you run a Toronto market or stall, pick it and send a claim. Same form as on each
          listing page.
        </p>
        <ContactClaim markets={listings.markets} vendors={listings.vendors} />
      </section>

      <section className="mt-10">
        <h2>Write us</h2>
        <p className="mt-2 text-base font-medium">{CONTACT_NAME}</p>
        <p className="mt-1 text-base text-muted-foreground">
          Founder, CEO of{" "}
          <a href={STUDIO_URL} rel="noreferrer" className="text-foreground hover:underline">LocalGovy</a>, the team behind {SITE_NAME}
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
