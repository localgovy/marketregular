import { cn } from "@/lib/utils";

export function Hours({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap font-mono text-sm tabular-nums", className)}>
      {value}
    </span>
  );
}
