"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { rememberInAppPath } from "@/lib/nav-history";

export function NavHistory() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    rememberInAppPath(`${pathname}${query ? `?${query}` : ""}`);
  }, [pathname, searchParams]);

  return null;
}
