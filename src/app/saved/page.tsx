import type { Metadata } from "next";
import Link from "next/link";
import { SavedDesk } from "@/components/saved-rail";
import { loadMySaves } from "@/lib/data/account";
import { getCurrentProfile, listMarkets, listVendors } from "@/lib/data/catalog";
import { pageMeta } from "@/lib/seo";
import { EMPTY_SAVES } from "@/lib/saves";

export const metadata: Metadata = pageMeta({
  title: "Saved markets and stalls",
  path: "/saved",
  description: "Markets and stalls saved to your account.",
  index: false,
});

export default async function SavedPage() {
  const [markets, vendors, profile] = await Promise.all([
    listMarkets(),
    listVendors(),
    getCurrentProfile(),
  ]);
  const saves = profile ? await loadMySaves() : EMPTY_SAVES;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Saved</h1>
      {profile ? (
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          Markets and stalls on this account.
        </p>
      ) : (
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          <Link
            href="/login?next=/saved"
            rel="nofollow"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>{" "}
          to save markets and stalls to this account.
        </p>
      )}
      {profile ? (
        <SavedDesk markets={markets} vendors={vendors} followAccount initialSaves={saves} />
      ) : null}
    </div>
  );
}
