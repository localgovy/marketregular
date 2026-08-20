import { cn } from "@/lib/utils";

export function NowLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("now-shimmer bg-ticket px-1.5 py-0.5 text-sm text-receipt", className)}>
      {children}
    </span>
  );
}
