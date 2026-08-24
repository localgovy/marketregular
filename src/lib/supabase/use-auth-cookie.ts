"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

/** Client hint that a session cookie is present. Re-checks after navigations. */
export function useAuthCookie() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(documentHasAuthCookie());
  }, [pathname]);

  return signedIn;
}
