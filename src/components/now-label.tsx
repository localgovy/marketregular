import { cn } from "@/lib/utils";

export function NowLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "now-open stall-chip-sm inline-flex items-center gap-1.5 bg-ticket px-2 py-0.5 text-sm text-receipt",
        className,
      )}
    >
      <span className="now-open-punch" aria-hidden />
      {children}
    </span>
  );
}
