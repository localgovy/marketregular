import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-heading text-4xl">That stall isn&apos;t here</h1>
      <p className="mt-3 text-muted-foreground">The market or vendor page may have moved.</p>
      <Link href="/search" className={buttonVariants({ className: "mt-6" })}>
        Search the directory
      </Link>
    </div>
  );
}
