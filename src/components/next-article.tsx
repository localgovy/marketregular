import Link from "next/link";
import { CaretRightMark } from "@/components/marks";
import { cn } from "@/lib/utils";

export function NextArticleLink({
  href,
  name,
  className,
}: {
  href: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`Next article: ${name}`}
      className={cn(
        "-mr-2 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-1.5 text-sm font-medium text-foreground hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
        className,
      )}
    >
      Next article
      <CaretRightMark className="size-5" />
    </Link>
  );
}
