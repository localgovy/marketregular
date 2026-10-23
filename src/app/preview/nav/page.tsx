import type { Metadata } from "next";
import { NavConcepts } from "@/app/preview/_components/nav-concepts";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Top nav bar redesign — mockups · ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function PreviewNavPage() {
  return <NavConcepts />;
}
