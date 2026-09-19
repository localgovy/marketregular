import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyReviews({
  signedIn,
  next,
}: {
  signedIn: boolean;
  next: string;
}) {
  return (
    <div className="mt-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <p className="text-base text-muted-foreground">
        No reviews yet. Tell the next shopper what was on the tables.
      </p>
      {signedIn ? null : (
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          rel="nofollow"
          className={cn(buttonVariants({ size: "sm" }), "mt-3 h-9 px-4")}
        >
          Sign in to write one
        </Link>
      )}
    </div>
  );
}
