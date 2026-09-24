import { VerifiedMark } from "@/components/marks";

const VERIFIED_SLUGS = new Set(["the-leslieville-farmers-market"]);

export function isVerifiedListing(slug: string) {
  return VERIFIED_SLUGS.has(slug);
}

export function VerifiedStamp() {
  return (
    <span className="ml-[0.28em] inline-block size-[0.72em] translate-y-[0.06em] align-[-0.08em] text-stamp">
      <VerifiedMark className="size-full" />
      <span className="sr-only"> Verified</span>
    </span>
  );
}

export function VerifiedName({ slug, name }: { slug: string; name: string }) {
  return (
    <>
      {name}
      {isVerifiedListing(slug) ? <VerifiedStamp /> : null}
    </>
  );
}
