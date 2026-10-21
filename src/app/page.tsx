import type { Metadata } from "next";
import { HomeAtlas } from "@/components/home-atlas";
import { HomeWalkthrough } from "@/components/home-walkthrough";
import { SITE_TITLE } from "@/lib/constants";
import { loadHomeAtlasData } from "@/lib/home-atlas-data";
import { pageMeta, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: SITE_TITLE,
  path: "/",
  description: SITE_DESCRIPTION,
});

export const revalidate = 120;

export default async function HomePage() {
  const data = await loadHomeAtlasData();

  return (
    <>
      <HomeWalkthrough />
      <HomeAtlas data={data} />
    </>
  );
}
