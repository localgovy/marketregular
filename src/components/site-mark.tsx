import { cn } from "@/lib/utils";

/** One enamel plate. Letters are the site Grotesk, not a custom monogram. */
export function SiteMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[3px] bg-board font-sans text-[0.8125rem] font-semibold leading-none tracking-[-0.05em] text-chalk",
        className,
      )}
      aria-hidden
    >
      MR
    </span>
  );
}
