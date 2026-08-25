import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ReviewSignupOverlay({ next }: { next: string }) {
  const href = `/signup?next=${encodeURIComponent(next || "/")}`;

  return (
    <Link
      href={href}
      aria-label="Sign up to leave a review"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card/90 px-3 outline-none hover:bg-card focus-visible:bg-card"
    >
      <span aria-hidden className="text-center text-sm font-medium">
        Sign up to leave a review
      </span>
      <span
        aria-hidden
        className={cn(buttonVariants({ size: "sm" }), "pointer-events-none h-8 rounded-full px-4")}
      >
        Sign up
      </span>
    </Link>
  );
}
