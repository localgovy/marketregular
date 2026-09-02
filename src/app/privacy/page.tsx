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
          {SITE_URL.replace(/^https:\/\//, "")}. There is no public street address. For privacy
          questions, access, correction, or deletion, write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>.
        </p>
      </section>

      <section className="mt-10">
        <h2>What we collect</h2>
        <p className={body}>
          You can read the directory without an account. If you create one, we keep the email and
          a password hash (Supabase stores the hash, not the password), or, if you continue with
          Google, the email, name, account id, and avatar URL Google sends us. You also choose a
          display name. Onboarding can store markets you care about.
        </p>
        <p className={body}>
          Posts, reviews, your display name, and avatar are public on the site. Saves, listing
          claims tied to an account, and the last time we emailed you a week plan stay private.
        </p>
        <p className={body}>
          You can claim a hall or stall without signing in. That form sends us your name, email,
          optional phone, role, business, website or Instagram, and notes. We use a hashed
          address of the request only to slow repeat sends.
        </p>
        <p className={body}>
          Nearby markets can use your location if you allow it in the browser. Those coordinates
          stay on your device. We do not send them to our servers.
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
          Most pages load Google Analytics 4 and Vercel Analytics. They see the pages you open,
          device type, and, for Google, a rough location from IP. Callbacks under /auth are kept
          out of analytics. Login and signup are measured like the rest of the site. There is no
          cookie banner. Block tracking in your browser or Google&apos;s ads settings if you do
          not want it.
        </p>
        <p className={body}>
          Maps load tiles from OpenFreeMap. That CDN sees your IP the way any map tile request
          does.
        </p>
      </section>

      <section className="mt-10">
        <h2>Mail</h2>
        <p className={body}>
          Claim notices go to us through Resend. If you ask for this week&apos;s markets from a
          signed-in account, Resend sends that mail to the address on the account. Confirm and
          password-reset mail goes through Supabase.
        </p>
      </section>

      <section className="mt-10">
        <h2>Who else sees it</h2>
        <p className={body}>
          Vercel hosts the site. Supabase holds accounts and the directory. Google handles
          Analytics and, if you choose it, sign-in. Resend sends the mail above. Those companies
          may process data outside Canada.
        </p>
        <p className={body}>
          We do not sell personal information. We do not take payments on {SITE_NAME} yet. We may
          share information if the law requires it, or to stop abuse.
        </p>
      </section>

      <section className="mt-10">
        <h2>Keeping it, changing it, deleting it</h2>
        <p className={body}>
          We keep account data while the account exists. On Account you can edit your display name
          and type delete to close the account. That removes the login, profile, posts, reviews,
          saves, and claims on our side. If you had claimed a listing, the listing stays and the
          claim holder is cleared. Copies can linger for a while in email, backups, hashed
          rate-limit rows, and analytics. You can also write{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we will do the same deletion from our side.
        </p>
      </section>

      <section className="mt-10">
        <h2>Children</h2>
        <p className={body}>
          {SITE_NAME} is not for children under 13. The feed is public. Do not create an account
          for someone younger than that.
        </p>
      </section>

      <section className="mt-10">
        <h2>Your rights</h2>
        <p className={body}>
          Under PIPEDA you can ask what we hold, ask us to correct it, and ask us to delete it,
          subject to what the law lets us keep. Start with the account page or{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
            {CONTACT_EMAIL}
          </a>. If we cannot resolve it, you can complain to the Office of the Privacy Commissioner of
          Canada.
        </p>
      </section>

      <section className="mt-10">
        <h2>Changes</h2>
        <p className={body}>
          If this policy changes in a way that matters, we will update the date at the top of this
          page.
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
