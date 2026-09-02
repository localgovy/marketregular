import type { ReactNode } from "react";
import {
  formatRatingAvg,
  formatReviewCount,
  listingScore,
  listingScoreLabel,
} from "@/lib/listing-score";
import { cn } from "@/lib/utils";

export function ScorePlate({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "stall-chip-sm type-nums inline-flex h-6 min-w-7 items-center justify-center bg-stamp px-1.5 text-sm text-chalk",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ListingScore({
  ratingAvg,
  reviewCount,
  compact = false,
  className,
}: {
  ratingAvg?: number | string | null;
  reviewCount?: number | null;
  compact?: boolean;
  className?: string;
}) {
  const score = listingScore(ratingAvg, reviewCount);
  if (!score) return null;

  const avg = formatRatingAvg(score.avg);
  const count = formatReviewCount(score.count);
  const noun = score.count === 1 ? "review" : "reviews";

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span className="sr-only">{listingScoreLabel(score)}</span>
      <ScorePlate>{avg}</ScorePlate>
      {compact ? null : (
        <span aria-hidden className="text-muted-foreground">
          {" "}
          {count} {noun}
        </span>
      )}
    </span>
  );
}

export function ReviewScore({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  if (value < 1 || value > 5) return null;
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="sr-only">{value} out of 5</span>
      <ScorePlate>{value}</ScorePlate>
    </span>
  );
}
