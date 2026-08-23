import Image from "next/image";
import { SITE_LOGO, STUDIO_LOGO } from "@/lib/constants";
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

export function StudioMark({ className }: { className?: string }) {
  return (
    <Image
      src={STUDIO_LOGO}
      alt=""
      width={192}
      height={192}
      sizes="20px"
      aria-hidden
      className={cn("size-5 shrink-0 rounded-[2px]", className)}
    />
  );
}
