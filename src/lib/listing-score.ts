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
  const hundredths = Math.round(avg * 100) / 100;
  return (Math.round(hundredths * 10) / 10).toFixed(1);
}

export function formatReviewCount(count: number) {
  const digits = String(Math.trunc(Math.abs(count)));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Row chrome: 57234 → 57k+. Full count stays in listingScoreLabel. */
export function formatReviewCountShort(count: number) {
  if (count < 1000) return formatReviewCount(count);
  return `${Math.floor(Math.abs(count) / 1000).toLocaleString("en-CA")}k+`;
}

export function listingScoreLabel(score: ListingScoreValue) {
  const noun = score.count === 1 ? "review" : "reviews";
  return `${formatRatingAvg(score.avg)} out of 5 from ${formatReviewCount(score.count)} ${noun}`;
}

export function listingScoreParens(score: ListingScoreValue) {
  return `${formatRatingAvg(score.avg)} (${formatReviewCountShort(score.count)})`;
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
