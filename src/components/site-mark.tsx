import {
  SITE_WORDMARK_GREEN_UI,
  SITE_WORDMARK_UI,
  STUDIO_WORDMARK_UI,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SiteWordmark({
  className,
  green,
}: {
  className?: string;
  /** Paint the green lockup file instead of masking currentColor. Footer only. */
  green?: boolean;
}) {
  if (green) {
    return (
      <img
        src={SITE_WORDMARK_GREEN_UI}
        alt=""
        aria-hidden
        width={405}
        height={60}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className={cn("site-wordmark-green", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn("site-wordmark", className)}
      style={{
        WebkitMaskImage: `url(${SITE_WORDMARK_UI})`,
        maskImage: `url(${SITE_WORDMARK_UI})`,
      }}
    />
  );
}

export function StudioWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "studio-wordmark text-primary lg:text-[#8fc9b4]",
        className,
      )}
      style={{
        WebkitMaskImage: `url(${STUDIO_WORDMARK_UI})`,
        maskImage: `url(${STUDIO_WORDMARK_UI})`,
      }}
    />
  );
}
