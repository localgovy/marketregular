"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const path = usePathname();
  const on = path === href || (href !== "/" && path.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn("hover:underline", on && "text-ticket", className)}
      aria-current={on ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
