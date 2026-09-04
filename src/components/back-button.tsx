"use client";

import { useRouter } from "next/navigation";
import { CaretLeftMark } from "@/components/marks";
import { goBackInApp } from "@/lib/nav-history";
import { cn } from "@/lib/utils";

export function BackButton({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const router = useRouter();

  function go() {
    goBackInApp(
      () => router.back(),
      (to) => router.push(to),
      href,
    );
  }

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={go}
      className={cn(
        "-ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
        className,
      )}
    >
      <CaretLeftMark className="size-5" />
    </button>
  );
}
