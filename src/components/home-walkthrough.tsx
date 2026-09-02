"use client";

import { useEffect, useState, type ComponentType } from "react";
import { homeWalkthroughSeen } from "@/lib/home-walkthrough";

export function HomeWalkthrough() {
  const [Panel, setPanel] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (homeWalkthroughSeen()) return;
    let cancelled = false;
    void import("@/components/home-walkthrough-panel").then((mod) => {
      if (!cancelled) setPanel(() => mod.HomeWalkthroughPanel);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Panel) return null;
  return <Panel />;
}
