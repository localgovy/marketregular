import { cn } from "@/lib/utils";

export function Hours({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("type-nums whitespace-nowrap text-sm", className)}>
      {value}
    </span>
  );
}
