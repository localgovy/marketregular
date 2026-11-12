"use server";

import {
  MAX_PRODUCT_SEARCH_OFFSET,
  MIN_PRODUCT_SEARCH_CHARS,
  normalizeSearchQuery,
  searchProducts,
} from "@/lib/data/product-search";
import { isInjectionProbe } from "@/lib/injection-probe";
import { takeCatalogSlot } from "@/lib/mail-limit";
import type { ProductHit } from "@/lib/product-hits";
import { tryAcquireSearchSlot } from "@/lib/search-concurrency";
import { foldSearchText } from "@/lib/search-text";
import { z } from "zod";

const moreSchema = z.object({
  q: z.string().trim().min(MIN_PRODUCT_SEARCH_CHARS).max(80),
  openToday: z.boolean().optional(),
  marketSlug: z.string().max(160).nullable().optional(),
  day: z.number().int().min(0).max(6).nullable().optional(),
  offset: z.number().int().min(0).max(MAX_PRODUCT_SEARCH_OFFSET),
});

export async function moreProducts(input: {
  q: string;
  openToday?: boolean;
  marketSlug?: string | null;
  day?: number | null;
  offset: number;
}): Promise<ProductHit[]> {
  if (isInjectionProbe(input.q) || isInjectionProbe(input.marketSlug)) return [];
  const parsed = moreSchema.safeParse({ ...input, q: normalizeSearchQuery(input.q) });
  if (!parsed.success) return [];
  if (isInjectionProbe(parsed.data.q) || isInjectionProbe(parsed.data.marketSlug)) return [];
  if (foldSearchText(parsed.data.q).length < MIN_PRODUCT_SEARCH_CHARS) return [];
  const releaseConcurrency = tryAcquireSearchSlot();
  if (!releaseConcurrency) return [];
  try {
    if (!(await takeCatalogSlot())) return [];
    return await searchProducts({
      q: parsed.data.q,
      openToday: parsed.data.openToday,
      marketSlug: parsed.data.marketSlug,
      day: parsed.data.day,
      offset: parsed.data.offset,
    });
  } finally {
    releaseConcurrency();
  }
}
