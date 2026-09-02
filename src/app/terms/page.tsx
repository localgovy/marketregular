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
        Using {SITE_NAME} means you agree to these terms. Current as of {LEGAL_EFFECTIVE}.
      </p>

      <section>
        <h2>The agreement</h2>
        <p className={body}>
          These terms are between you and {LEGAL_ENTITY}, a corporation in {LEGAL_JURISDICTION},
          for the {SITE_NAME} website. Creating an account — email and password, or Continue with
          Google — is acceptance. Reading the directory without an account is still use of the
          site.
        </p>
      </section>

      <section className="mt-10">
        <h2>The directory</h2>
        <p className={body}>
          {SITE_NAME} is a compiled guide to halls and stalls. It is not each market&apos;s
          official notice. Hours move, stalls move, weather closes a floor. Check with the hall
          before you go. We are not the agent of every listing. Where About talks about partners,
          that means halls we actually work with, not automatic affiliation with every name in the
          list.
        </p>
      </section>

      <section className="mt-10">
        <h2>No checkout yet</h2>
        <p className={body}>
          {SITE_NAME} does not sell groceries or take payment on this site. Pickup, if it ships,
          will have its own terms. These ones do not cover refunds, orders, or card charges.
        </p>
      </section>

      <section className="mt-10">
        <h2>Accounts</h2>
        <p className={body}>
          One person per account. Keep the password to yourself. You are responsible for what
          happens on the account. We can close it if these terms are broken, if the feed is
          abused, or if we have to for the law.
        </p>
      </section>

      <section className="mt-10">
        <h2>Posts and reviews</h2>
        <p className={body}>
          You own what you write. You give {LEGAL_ENTITY} a licence to show it on {SITE_NAME}. Do
          not post anything illegal, spam, or impersonation. We can flag or remove posts and
          reviews. Closing the account deletes your posts and reviews on our side.
        </p>
      </section>

      <section className="mt-10">
        <h2>Claims</h2>
        <p className={body}>
          Sending a claim is a request. It does not hand you the listing. We look at it and decide.
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
          Use the site as a person looking up markets. Do not attack it, scrape it beyond ordinary
          browsing, or try to open someone else&apos;s account.
        </p>
      </section>

      <section className="mt-10">
        <h2>If something goes wrong</h2>
        <p className={body}>
          We work to keep hours and names right. We are not responsible if you travel to a hall
          that is closed, if a third-party map or site fails, or if the network drops. These terms
          do not take away rights you have under Ontario consumer law.
        </p>
      </section>

      <section className="mt-10">
        <h2>Ontario law</h2>
        <p className={body}>
          The laws of {LEGAL_JURISDICTION} govern these terms. The courts of Ontario have
          jurisdiction, except where the law says you may use another court.
        </p>
      </section>

      <section className="mt-10">
        <h2>Contact</h2>
        <p className={body}>
          Write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>. How we handle personal information is in the{" "}
          <Link href="/privacy" className="font-medium text-foreground hover:underline">
            Privacy policy
          </Link>
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
