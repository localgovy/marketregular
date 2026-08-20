import { AsteriskMark } from "@/components/marks";
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
        "now-open stall-chip-sm inline-flex items-center gap-1.5 bg-receipt px-2 py-0.5 text-sm font-medium text-stamp",
        className,
      )}
    >
      <AsteriskMark className="now-open-stamp size-3" />
      {children}
    </span>
  );
}
