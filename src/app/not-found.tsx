import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { NotFoundSearch } from "@/components/not-found-search";
import { noIndex } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
  robots: noIndex,
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1>This market or vendor isn&apos;t here</h1>
      <p className="type-lede mt-3 text-muted-foreground">
        The page may have moved. Search for the name, or browse the directory.
      </p>
      <NotFoundSearch />
      <Link href="/markets" className={buttonVariants({ className: "mt-6" })}>
        Browse markets
      </Link>
    </div>
  );
}
