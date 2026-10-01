import type { Metadata } from "next";
import Link from "next/link";
import { SavedDesk } from "@/components/saved-rail";
import { listBlogPosts } from "@/lib/blog";
import { readMySaves } from "@/lib/data/account";
import { getCurrentProfile, listMarkets, listVendors } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";
import { EMPTY_SAVES } from "@/lib/saves";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = pageMeta({
  title: "Saved markets, vendors, products, and notes",
  path: "/saved",
  description: "Markets, vendors, products, blog posts, and reviews saved to your account.",
  index: false,
});

export default async function SavedPage() {
  const notes = listBlogPosts();
  const [markets, vendors, profile] = await Promise.all([
    listMarkets(),
    listVendors(),
    getCurrentProfile(),
  ]);
  const loaded = profile ? await readMySaves() : { saves: EMPTY_SAVES, failed: false };
  const saves = loaded.saves;
  const suggested = [...markets]
    .filter((market) => market.city.trim().toLowerCase() === LAUNCH_CITY.toLowerCase())
    .sort((a, b) => b.review_count - a.review_count || a.name.localeCompare(b.name))
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Saved</h1>
      {profile ? (
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          Markets, vendors, products, blog posts, and reviews on this account.
        </p>
      ) : (
        <>
          <p className="type-lede mt-2 mb-6 text-muted-foreground">
            Sign in to keep markets, vendors, and products on a list that follows you.
          </p>
          {suggested.length ? (
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
          ) : null}
          <Link
            href="/login?next=/saved"
            rel="nofollow"
            className={buttonVariants()}
          >
            Sign in
          </Link>
        </>
      )}
      {profile && loaded.failed ? (
        <p className="text-base text-muted-foreground">
          Couldn&apos;t load your saves. Refresh the page.
        </p>
      ) : null}
      {profile && !loaded.failed ? (
        <SavedDesk
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
