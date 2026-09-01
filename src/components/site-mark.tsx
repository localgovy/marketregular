import { SITE_WORDMARK, SITE_WORDMARK_GREEN, STUDIO_WORDMARK } from "@/lib/constants";
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
        src={SITE_WORDMARK_GREEN}
        alt=""
        aria-hidden
        width={506}
        height={75}
        className={cn("site-wordmark-green", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn("site-wordmark", className)}
      style={{
        WebkitMaskImage: `url(${SITE_WORDMARK})`,
        maskImage: `url(${SITE_WORDMARK})`,
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
        WebkitMaskImage: `url(${STUDIO_WORDMARK})`,
        maskImage: `url(${STUDIO_WORDMARK})`,
      }}
    />
  );
}
