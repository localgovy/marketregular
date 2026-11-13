import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { SavedList } from "@/components/saved-rail";
import { listBlogPosts } from "@/lib/blog";
import { readMySaves } from "@/lib/data/account";
import { getCurrentProfile, listMarkets, listVendors } from "@/lib/data/catalog";
import { cookieLooksLikeSupabaseAuth } from "@/lib/supabase/auth-cookie";
import { copyText, siteCopy } from "@/content/site-copy";
import { LAUNCH_CITY } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";
import { EMPTY_SAVES } from "@/lib/saves";
import { buttonVariants } from "@/components/ui/button";

export const maxDuration = 60;

export const metadata: Metadata = pageMeta({
  title: siteCopy["/saved"].title,
  path: "/saved",
  description: siteCopy["/saved"].description,
  index: false,
});

export default async function SavedPage() {
  const notes = listBlogPosts();
  const jar = await cookies();
  const authed = jar.getAll().some((cookie) => cookieLooksLikeSupabaseAuth(cookie.name));
  const profile = authed ? await getCurrentProfile() : null;
  const [markets, vendors] = await Promise.all([
    listMarkets(),
    profile ? listVendors() : Promise.resolve([]),
  ]);
  const loaded = profile ? await readMySaves() : { saves: EMPTY_SAVES, failed: false };
  const saves = loaded.saves;
  const suggested = [...markets]
    .filter((market) => market.city.trim().toLowerCase() === LAUNCH_CITY.toLowerCase())
    .sort((a, b) => b.review_count - a.review_count || a.name.localeCompare(b.name))
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>{siteCopy["/saved"].h1}</h1>
      {profile ? (
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          {siteCopy["/saved"].ledeSignedIn}
        </p>
      ) : (
        <>
          <p className="type-lede mt-2 mb-6 text-muted-foreground">
            {siteCopy["/saved"].ledeSignedOut}
          </p>
          {suggested.length ? (
            <>
              <p className="mb-2 text-base font-medium">{copyText(siteCopy["/saved"].popular)}</p>
              <ul className="mb-6 divide-y divide-border ring-1 ring-border">
                {suggested.map((market) => (
                  <li key={market.id} className="px-4 py-3">
                    <Link href={`/markets/${market.slug}`} className="font-medium hover:underline">
                      {market.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{market.city}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <Link
            href="/login?next=/saved"
            rel="nofollow"
            className={buttonVariants()}
          >
            {siteCopy["/saved"].signIn}
          </Link>
        </>
      )}
      {profile && loaded.failed ? (
        <p className="text-base text-muted-foreground">
          {siteCopy["/saved"].loadFailed}
        </p>
      ) : null}
      {profile && !loaded.failed ? (
        <SavedList
          markets={markets}
          vendors={vendors}
          notes={notes.map(({ slug, title, date, kicker }) => ({ slug, title, date, kicker }))}
          followAccount
          initialSaves={saves}
        />
      ) : null}
    </div>
  );
}
