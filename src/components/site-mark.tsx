import { SITE_WORDMARK, STUDIO_WORDMARK } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SiteWordmark({ className }: { className?: string }) {
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
