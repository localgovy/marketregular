import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT_EMAIL,
  LEGAL_EFFECTIVE,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  SITE_NAME,
} from "@/lib/constants";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Terms",
  path: "/terms",
  description: `Terms for using ${SITE_NAME}, the Toronto farmers' market directory.`,
});

const body = "mt-2 text-base leading-relaxed text-muted-foreground";

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Terms</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Using {SITE_NAME} means you agree to these terms. Current as of {LEGAL_EFFECTIVE}. Creating
        an account, with email and password or Continue with Google, is acceptance. Reading the
        directory without an account is still use of the site.
      </p>

      <section>
        <h2>The agreement</h2>
        <p className={body}>
          These terms are between you and {LEGAL_ENTITY}, a corporation in {LEGAL_JURISDICTION},
          for the {SITE_NAME} website. If you open a stall or market account, you are agreeing for
          that business as well as for yourself. The stall fee below is billed by LOCALGOVY, an
          Ontario sole proprietorship. How we handle personal information is in the{" "}
          <Link href="/privacy" className="font-medium text-foreground hover:underline">
            Privacy policy
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2>The directory</h2>
        <p className={body}>
          {SITE_NAME} is a compiled guide to markets and vendors. It is not each market&apos;s
          official notice. Hours move, vendors move, weather closes a market. Check with the market
          before you go. We are not the agent, partner, or joint venturer of a listing. Where About
          talks about partners, that means markets we actually work with, not automatic affiliation
          with every name in the list.
        </p>
        <p className={body}>
          We do not sell a higher place in the list. The public score on a listing is an outside
          rating we store. It is not a score calculated from posts on this site.
        </p>
      </section>

      <section className="mt-10">
        <h2>Stall and market accounts</h2>
        <p className={body}>
          Creating a vendor or market account is a request. It does not hand you the listing. We
          look at it and may assign the stall or market, or decline. One account can hold more than
          one listing. One listing has one owner.
        </p>
        <p className={body}>
          You confirm that you run that stall or market, or that the person who runs it has allowed
          you to open the account. You confirm you are an adult and allowed to bind that business.
          Keep the password to yourself. You are responsible for what happens on the account until
          you tell us the login should move and we take it off the listing.
        </p>
        <p className={body}>
          After we assign a stall, that account can edit its name, description, logo, tags, phone,
          email, links, menu, and the markets it attends, including the days. After we assign a
          market, that account can edit the market&apos;s name, description, hours, logo, tags,
          phone, email, links, and the stalls at that market. The street address and the map pin
          are not edited there. Write us if the market moves. The web address, published or draft
          status, and the public score stay with us. Selling on the site stays off until we turn it
          on for that stall.
        </p>
        <p className={body}>
          A market can add a stall that is not listed yet. That page is public, with no owner,
          until a vendor account is assigned. The market can edit that stall&apos;s profile until
          then, unless a request for it is already waiting. Add a stall only if it sells at that
          market, and publish a phone or email only if the stall is willing to have it on the page.
          A stall adds a market only on days it is actually there. Either side can update those
          days. A stall with no market is hidden on the public site, unless it is a listing we
          already show without a hall.
        </p>
        <p className={body}>
          Phone, email, and the logo you enter are shown on the public page. Use a logo you have
          the right to show. When the account is assigned, you are responsible for the listing
          from then on, including details that were already on the page. Change anything that is
          wrong. Keep the name, hours, days, menu, prices, and contact details accurate. People
          use them to decide where to go. Tags and dietary notes are your
          description of the food. They are not a check by us. Someone with an allergy should ask
          the stall. You are responsible for your own permits, safe food, labels, and any licence
          you need, including for alcohol. We do not inspect a stall.
        </p>
        <p className={body}>
          You keep ownership of your name, text, menu, photos, and logo. You give {LEGAL_ENTITY}{" "}
          permission to store them and show them on {SITE_NAME}, in search, and in the account
          emails we already send. You allow us to resize a logo so it fits the page. That
          permission is free and not exclusive. It lasts while the material is on the site, and
          afterward only in backups and in a copy already sent. Taking a logo down, or closing the
          account, stops the public page from showing what you removed. The listing itself can
          stay.
        </p>
        <p className={body}>
          On the account, Updates lets you check a section so our routine updates from public
          sources skip it. You keep that section yourself. We can still unpublish a listing, remove
          the account from it, or take down something these terms do not allow.
        </p>
        <p className={body}>
          We can refuse a request, edit a listing, or take an account off it.
        </p>
      </section>

      <section className="mt-10">
        <h2>Orders</h2>
        <p className={body}>
          A stall sells its own items. {SITE_NAME} hosts the page and is not the seller. When
          selling is open and we have approved that stall, the card payment runs on the stall&apos;s
          Stripe account, in the stall&apos;s name. We do not hold that money, and card numbers stay
          with Stripe. The stall accepts Stripe&apos;s terms when it sets up payments. You need an
          account to buy. The price on the item is the amount charged, before any tax the payment
          adds. The stall sets delivery, pickup, or preorder, and any terms shown before you pay.
          Refunds, chargebacks, and handing the item over are the stall&apos;s. The stall sees the
          order details it needs. We do not have to resolve a dispute between a buyer and a stall.
        </p>
        <p className={body}>
          LOCALGOVY, an Ontario sole proprietorship, bills the stall 3.5% of the amount still
          charged, plus $0.25 CAD, on each paid checkout. That fee is not added to the buyer&apos;s
          payment. A full refund removes the fee. A partial refund reduces the percentage and
          leaves the $0.25. Money returned to the buyer, including a lost chargeback, reduces or
          removes the fee the same way. The stall can pay what it owes at any time once the balance
          is at least $0.50. A smaller balance stays due until it reaches that. What is still
          unpaid is due on 31 December of the year of the oldest unpaid fee. An overpayment sits as
          a credit on the next stall fee. If tax applies to the stall fee, it is charged to the
          stall, not added to the buyer&apos;s payment. We can turn selling off on a stall that
          leaves the fee unpaid.
        </p>
      </section>

      <section className="mt-10">
        <h2>Posts and reviews</h2>
        <p className={body}>
          You own what you write, and the photos you attach. You give {LEGAL_ENTITY} permission to
          show them on {SITE_NAME} while they are up, on the same terms as a listing. Do not post
          anything illegal, anything that pretends to be someone else, or spam. We can flag or
          remove posts and reviews. We do not remove a note only because a stall or market dislikes
          it. Closing the account deletes your posts and reviews on our side.
        </p>
      </section>

      <section className="mt-10">
        <h2>Your login</h2>
        <p className={body}>
          One person holds the login. A password you choose stays a hash. A password issued for an
          older stall approval is visible in admin until it is replaced. You are responsible for
          what happens on the account. We can close it if these terms are broken, if the feed is
          abused, or if we have to for the law.
        </p>
      </section>

      <section className="mt-10">
        <h2>Location</h2>
        <p className={body}>
          Nearby is optional. The browser asks first. You can refuse and still use the rest of the
          site.
        </p>
      </section>

      <section className="mt-10">
        <h2>Acceptable use</h2>
        <p className={body}>
          Use the site as a person looking up markets, or as the stall or market the account is
          for. Do not attack it, scrape it beyond ordinary browsing, or try to open someone
          else&apos;s account. Do not use it to break the law, to pretend you are another stall or
          market, to publish someone else&apos;s private information, or to send spam.
        </p>
        <p className={body}>
          If you believe a page uses your work without permission, write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          with the page address and what you own. We will look, and we can take it down while we
          do.
        </p>
      </section>

      <section className="mt-10">
        <h2>If something goes wrong</h2>
        <p className={body}>
          We work to keep hours and names right. The directory can still be wrong, and the site can
          be down. We are not responsible if you travel to a market that is closed, if a stall is
          out of something, if a third-party map, payment service, or host fails, or if the network
          drops.
        </p>
        <p className={body}>
          The stall and market accounts are free to open. We are not responsible to that business
          for lost sales, lost visitors, or other indirect loss from the site or a listing. Our
          total responsibility to that business for the account is limited to the greater of $100
          CAD and the stall fees that account paid LOCALGOVY in the 12 months before the claim.
          This limit does not apply to fraud, or to anything the law does not allow us to limit.
        </p>
        <p className={body}>
          If someone brings a claim against us because of what this account adds or keeps on a
          listing it controls, or because of an order from its stall, that stall or market will
          deal with the claim, including reasonable legal costs. If you opened the account without
          authority to bind them, you deal with the claim yourself. This does not apply when the
          claim is caused by our fraud, or when the law does not allow us to shift it to you.
        </p>
        <p className={body}>
          These terms do not take away rights a shopper has under Ontario consumer law.
        </p>
      </section>

      <section className="mt-10">
        <h2>Ontario law</h2>
        <p className={body}>
          The laws of {LEGAL_JURISDICTION}, and the federal laws of Canada that apply, govern these
          terms. The courts of Ontario have jurisdiction over a dispute about a stall or market
          account. A shopper may also use another court where the law says so.
        </p>
      </section>

      <section className="mt-10">
        <h2>Changes</h2>
        <p className={body}>
          If these terms change in a way that matters, we update the date at the top of this page.
          If the change affects a stall or market account, we email that account. Using the site
          after the new date is acceptance. You can close the account if you do not want the
          change.
        </p>
      </section>

      <section className="mt-10">
        <h2>The rest</h2>
        <p className={body}>
          These terms and the privacy policy are the whole agreement for the site. If a court sets
          one sentence aside, the rest stays. We can assign this agreement if someone else takes
          over the site. You cannot transfer the account without us. A notice to you can go to the
          email on the account. A notice to us goes to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2>Contact</h2>
        <p className={body}>
          Write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <p className="mt-10 text-base">
        <Link href="/privacy" className="font-medium hover:underline">
          Privacy
        </Link>
      </p>
    </div>
  );
}
