import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  LEGAL_EFFECTIVE,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  SITE_NAME,
  SITE_URL,
} from "@/lib/constants";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Privacy",
  path: "/privacy",
  description: `How ${SITE_NAME} collects, uses, and deletes personal information.`,
});

const body = "mt-2 text-base leading-relaxed text-muted-foreground";

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Privacy</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        {LEGAL_ENTITY} operates {SITE_NAME}. This policy is current as of {LEGAL_EFFECTIVE}.
      </p>

      <section>
        <h2>Who we are</h2>
        <p className={body}>
          {LEGAL_ENTITY} is a corporation in {LEGAL_JURISDICTION}. We run {SITE_NAME} at{" "}
          {SITE_URL.replace(/^https:\/\//, "")}. There is no public street address. Privacy
          questions, access, correction, and deletion go to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>
          . That inbox is the person responsible for this policy.
        </p>
      </section>

      <section className="mt-10">
        <h2>Why we use it</h2>
        <p className={body}>
          We use personal information to run your account, publish the directory, send mail the
          account needs or that you asked for, complete an order when a stall is selling, keep the
          stall-fee record, see which pages are used, and stop abuse. We do not sell personal
          information, and we do not build an advertising profile of you for other sites.
        </p>
      </section>

      <section className="mt-10">
        <h2>What we collect</h2>
        <p className={body}>
          You can read the directory without an account. If you create one, we keep the email and
          a password hash. Supabase stores the hash, not the password. If you continue with Google,
          we keep the email, name, account id, and avatar URL Google sends us. You also choose a
          display name. A shopper account can store a handle and up to three markets picked during
          onboarding.
        </p>
        <p className={body}>
          Posts, photos on those posts, reviews, your display name, and avatar are public on the
          site. Saves, vendor and market account requests, and the last time we emailed you a week
          plan stay on the account.
        </p>
        <p className={body}>
          A vendor or market account uses the email you give, including a Gmail address, and the
          password you choose. The request names the organization, or points at a published stall
          or market. We keep a hash of the network address on that request only to slow repeat
          sends. The hash is not the address itself. Sign-in is limited the same way, with a hash
          of the email or the network address. Those rows are cleared after two days.
        </p>
        <p className={body}>
          After we assign a stall, that account can edit the stall&apos;s name, description, logo,
          tags, phone, email, links, menu, and which markets it attends. It cannot change the web
          address, whether the page is published, or the public score. After we assign a market,
          that account can edit the market&apos;s name, description, hours, logo, tags, phone, email,
          links, and the stalls at that market. The street address and the map pin stay with us. A
          stall the market adds is public and stays without an owner until we assign a vendor
          account. Until then, that market can edit the stall&apos;s profile, unless a request for
          it is already waiting.
        </p>
        <p className={body}>
          Phone, email, and the logo are shown on the public page. The logo file is stored with the
          directory. Use a phone and email the stall or market is willing to have on that page. A
          market that types a stall&apos;s phone or email is publishing it.
        </p>
        <p className={body}>
          If a stall is approved to sell, we also store that selling is on, which menu items are
          for sale, and the delivery, pickup, or preorder terms the stall writes. An order stores
          the item, quantity, price, how the buyer asked for it, the buyer&apos;s email, and, for
          delivery, a name and address so the stall can hand it over. Card numbers stay with
          Stripe. We do not store them.
        </p>
        <p className={body}>
          When we assign a stall or market, we email a link to that portal. We do not replace the
          password you chose. A password issued for an older approval can still be shown in admin
          until you replace it. Shopper passwords, and passwords chosen on the vendor or market
          portal, stay a hash only. An issued-password copy is removed when the account is deleted.
        </p>
        <p className={body}>
          Nearby markets can use your location if you allow it in the browser. Near me sends those
          coordinates with that search so the list can be sorted by distance, and they show in the
          page address. We do not save them on your account.
        </p>
      </section>

      <section className="mt-10">
        <h2>Cookies, storage, and analytics</h2>
        <p className={body}>
          Sign-in needs cookies for the session and to remember where to send you after Google or
          email confirm. Signed-in saves may also sit in this browser so the site feels instant.
          We use this browser to remember that you dismissed the sign-in slip or home walkthrough.
          Google sign-in keeps a short handoff in session storage, then drops it.
        </p>
        <p className={body}>
          Most pages load Google Analytics 4 and Vercel Analytics, after you click or type, or
          after a short pause. They see the pages you open, device type, and, for Google, a rough
          location from IP. Callbacks under /auth are kept out of analytics. Login and signup are
          measured like the rest of the site. There is no cookie banner. Block tracking in your
          browser or Google&apos;s ads settings if you do not want it.
        </p>
        <p className={body}>
          Signup, posts, and portal forms are checked so an automated script cannot create an
          account or a post. That check looks at the request. It is not a profile we keep.
        </p>
        <p className={body}>
          Maps load tiles from OpenFreeMap. That CDN sees your IP the way any map tile request
          does. A directions link leaves this site for Google Maps.
        </p>
      </section>

      <section className="mt-10">
        <h2>Mail</h2>
        <p className={body}>
          Account mail is the note the account needs. Confirming the address and resetting a
          password go through Supabase. Account requests go to us through Resend. When a stall or
          market is assigned, or when we cannot assign one, Resend sends that note to the account
          email. If you ask for this week&apos;s markets from a signed-in account, Resend sends that
          mail to the address on the account. We do not run a separate advertising list.
        </p>
      </section>

      <section className="mt-10">
        <h2>Who else sees it</h2>
        <p className={body}>
          Vercel hosts the site. Supabase holds accounts, the directory, and logo and post files.
          Stripe handles card numbers for stall checkout and for the stall fee, when those are on.
          Google handles Analytics and, if you choose it, sign-in. Resend sends the mail above.
          OpenFreeMap serves map tiles. Those companies process information for us, and we use them
          to run the site. They may store it outside Canada, including in the United States. While
          it is there, a court or public authority in that country may be able to require them to
          disclose it.
        </p>
        <p className={body}>
          We may share information if the law requires it, or to stop abuse. The stall sees the
          order details it needs to fulfill. A later owner of that listing does not receive the
          earlier orders.
        </p>
      </section>

      <section className="mt-10">
        <h2>Keeping it, changing it, deleting it</h2>
        <p className={body}>
          We keep account data while the account exists. On Account you can edit your display name
          and type delete to close the account. That removes the login, profile, posts, photos on
          those posts, reviews, saves, and portal requests on our side. If a listing was assigned
          to you, the listing stays and the account is taken off it. Order records and the
          stall-fee ledger stay so the stall can still fulfill an order and so the tax record stays
          accurate. We keep those for at least six years after the year they relate to, and longer
          if a dispute about them is still open. The account link on an order is cleared when the
          buyer deletes the account. Copies can linger for a while in email, backups, and
          analytics.
        </p>
        <p className={body}>
          You can also write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we will do the same deletion from our side. We answer an access, correction, or
          deletion request as soon as we can, and within 30 days unless the law allows longer and
          we tell you.
        </p>
      </section>

      <section className="mt-10">
        <h2>A breach</h2>
        <p className={body}>
          If a breach of our safeguards creates a real risk of significant harm, we tell the people
          affected and the Office of the Privacy Commissioner of Canada, as the law requires.
        </p>
      </section>

      <section className="mt-10">
        <h2>Children</h2>
        <p className={body}>
          {SITE_NAME} is not for children under 13. The feed is public. Do not create an account
          for someone younger than that. A stall or market account is for an adult who is allowed
          to speak for that business.
        </p>
      </section>

      <section className="mt-10">
        <h2>Your rights</h2>
        <p className={body}>
          Under PIPEDA you can ask what we hold, ask us to correct it, and ask us to delete it,
          subject to what the law lets us keep, including a tax record and an order a stall still
          has to fulfill. You can withdraw consent by closing the account or by writing us. A
          record we are required to keep can stay. Start with the account page or{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>
          . If we cannot resolve it, you can complain to the Office of the Privacy Commissioner of
          Canada.
        </p>
      </section>

      <section className="mt-10">
        <h2>Changes</h2>
        <p className={body}>
          If this policy changes in a way that matters, we update the date at the top of this page.
          If the change affects a stall or market account, we also email that account.
        </p>
      </section>

      <p className="mt-10 text-base">
        <Link href="/terms" className="font-medium hover:underline">
          Terms
        </Link>
      </p>
    </div>
  );
}
