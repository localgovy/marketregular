import { AsteriskMark } from "@/components/marks";
import {
  formatRatingAvg,
  formatReviewCount,
  listingScore,
  listingScoreLabel,
} from "@/lib/listing-score";
import { cn } from "@/lib/utils";

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
    <span
      className={cn("inline-flex items-baseline gap-1.5 text-sm", className)}
      aria-label={listingScoreLabel(score)}
    >
      <AsteriskMark className="size-3 shrink-0 self-center text-ticket" />
      <span className="font-mono tabular-nums tracking-tight">{avg}</span>
      {compact ? null : (
        <span className="text-muted-foreground">
          {count} {noun}
        </span>
      )}
    </span>
  );
}
