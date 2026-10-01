"use server";

import { searchProducts } from "@/lib/data/product-search";
import type { ProductHit } from "@/lib/product-hits";
import { z } from "zod";

const moreSchema = z.object({
  q: z.string().trim().min(1).max(80),
  openToday: z.boolean().optional(),
  marketSlug: z.string().max(160).nullable().optional(),
  day: z.number().int().min(0).max(6).nullable().optional(),
  offset: z.number().int().min(0).max(4_000),
});

export async function moreProducts(input: {
  q: string;
  openToday?: boolean;
  marketSlug?: string | null;
  day?: number | null;
  offset: number;
}): Promise<ProductHit[]> {
  const parsed = moreSchema.safeParse(input);
  if (!parsed.success) return [];
  return searchProducts({
    q: parsed.data.q,
    openToday: parsed.data.openToday,
    marketSlug: parsed.data.marketSlug,
    day: parsed.data.day,
    offset: parsed.data.offset,
  });
}
