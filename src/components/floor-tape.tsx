import Link from "next/link";
import { FloorTapeLive } from "@/components/floor-tape-live";
import { ReviewCard } from "@/components/review-card";
import type { FloorItem } from "@/types/database";

export function FloorTape({ initialItems }: { initialItems: FloorItem[] }) {
  return (
    <div className="flex min-h-0 flex-col bg-background lg:h-full">
      <div className="min-h-0 lg:tape-scroll lg:flex-1 lg:overflow-y-auto">
        <FloorTapeLive>
          <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
            <h2 className="type-column">Reviews</h2>
            <Link
              href="/feed"
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              All posts
            </Link>
          </header>
        </FloorTapeLive>
        {initialItems.length ? (
          <ol>
            {initialItems.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </ol>
        ) : (
          <p className="px-3 py-4 text-base text-muted-foreground">
            The live list is empty. Write what you saw in the box above, or browse{" "}
            <Link href="/events" className="font-medium text-foreground hover:underline">
              this week&apos;s hours
            </Link>{" "}
            and{" "}
            <Link href="/markets" className="font-medium text-foreground hover:underline">
              Find Markets
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
