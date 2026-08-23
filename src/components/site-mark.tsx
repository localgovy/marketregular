import Image from "next/image";
import { SITE_LOGO, STUDIO_WORDMARK } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SiteMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={SITE_LOGO}
      alt=""
      width={96}
      height={96}
      sizes="32px"
      priority={priority}
      aria-hidden
      className={cn("size-8 shrink-0 rounded-[3px]", className)}
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
