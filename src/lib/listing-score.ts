export type ListingScoreValue = {
  avg: number;
  count: number;
};

export function listingScore(
  ratingAvg: number | string | null | undefined,
  reviewCount: number | null | undefined,
): ListingScoreValue | null {
  const count = Number(reviewCount ?? 0);
  const avg =
    typeof ratingAvg === "number"
      ? ratingAvg
      : ratingAvg == null || ratingAvg === ""
        ? Number.NaN
        : Number(ratingAvg);
  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(avg) || avg < 1 || avg > 5) return null;
  return { avg, count };
}

export function formatRatingAvg(avg: number) {
  return avg.toFixed(1);
}

export function formatReviewCount(count: number) {
  return count.toLocaleString("en-CA");
}

export function listingScoreLabel(score: ListingScoreValue) {
  const noun = score.count === 1 ? "review" : "reviews";
  return `${formatRatingAvg(score.avg)} out of 5 from ${formatReviewCount(score.count)} ${noun}`;
}

export function withListingStats<T extends { review_count?: unknown; rating_avg?: unknown }>(
  row: T,
): T & { review_count: number; rating_avg: number | null } {
  const score = listingScore(
    row.rating_avg as number | string | null | undefined,
    row.review_count as number | null | undefined,
  );
  return {
    ...row,
    review_count: score?.count ?? 0,
    rating_avg: score?.avg ?? null,
  };
}
