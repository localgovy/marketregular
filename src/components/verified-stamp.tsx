import { VerifiedMark } from "@/components/marks";
import { cn } from "@/lib/utils";

const VERIFIED_SLUGS = new Set(["the-leslieville-farmers-market"]);

export function isVerifiedListing(slug: string) {
  return VERIFIED_SLUGS.has(slug);
}

export function VerifiedStamp({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={cn(
        "ml-[0.22em] inline-block align-middle text-stamp",
        size === "lg" ? "size-[1.45em]" : "size-[0.82em]",
      )}
    >
      <VerifiedMark className="size-full" />
      <span className="sr-only"> Verified</span>
    </span>
  );
}

export function VerifiedName({
  slug,
  name,
  size = "md",
}: {
  slug: string;
  name: string;
  size?: "md" | "lg";
}) {
  return (
    <>
      {name}
      {isVerifiedListing(slug) ? <VerifiedStamp size={size} /> : null}
    </>
  );
}
