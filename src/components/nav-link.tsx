"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  className,
  variant = "text",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "text" | "tab";
}) {
  const path = usePathname();
  const on = path === href || (href !== "/" && path.startsWith(`${href}/`));
  const tab = variant === "tab";

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        tab
          ? "inline-flex h-full min-w-0 shrink-0 items-center px-5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-card hover:text-foreground"
          : "hover:underline",
        on &&
          (tab
            ? "bg-card text-foreground shadow-[inset_0_-3px_0_0_var(--primary)]"
            : "text-stamp underline decoration-stamp decoration-1 underline-offset-8"),
        className,
      )}
      aria-current={on ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
