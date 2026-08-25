import { cn } from "@/lib/utils";

export function FilterClearButton({
  onClick,
  disabled,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "shrink-0 text-sm font-medium underline underline-offset-4 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      Clear
    </button>
  );
}
