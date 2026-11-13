import Link from "next/link";
import { siteCopy } from "@/content/site-copy";
import { buttonVariants } from "@/components/ui/button";
import { NotFoundSearch } from "@/components/not-found-search";
import { noIndex } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: siteCopy["/not-found"].title,
  robots: noIndex,
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20" data-not-found="">
      <h1>{siteCopy["/not-found"].h1}</h1>
      <p className="type-lede mt-3 text-muted-foreground">
        {siteCopy["/not-found"].lede}
      </p>
      <NotFoundSearch />
      <Link href="/markets" className={buttonVariants({ className: "mt-6" })}>
        {siteCopy["/not-found"].browse}
      </Link>
    </div>
  );
}
