"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });

export function AppToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 8000 });
      return () => win.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setReady(true), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return <Toaster theme="light" richColors />;
}
