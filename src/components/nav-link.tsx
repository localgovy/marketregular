"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  className,
  variant = "text",
  prefetch = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "text" | "tab" | "slab";
  prefetch?: boolean;
}) {
  const path = usePathname();
  const on = path === href || (href !== "/" && path.startsWith(`${href}/`));
  const tab = variant === "tab";
  const slab = variant === "slab";

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        tab
          ? "inline-flex h-full min-w-0 shrink-0 items-center px-5 text-sm font-medium whitespace-nowrap text-foreground hover:bg-card"
          : slab
            ? "inline-flex h-10 shrink-0 items-center px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
            : "hover:underline",
        on &&
          (tab
            ? "bg-card text-foreground shadow-[inset_0_-3px_0_0_var(--primary)]"
            : slab
              ? "stall-chip bg-chalk text-board shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
              : "text-stamp underline decoration-stamp decoration-1 underline-offset-8"),
        !on && slab && "text-chalk/80 hover:bg-chalk/10 hover:text-chalk",
        className,
      )}
      aria-current={on ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
